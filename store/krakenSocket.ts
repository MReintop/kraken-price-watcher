import type { AppDispatch } from './store';
import { subscribeAppState } from '../lib/appState';
import {
  socketStatusChanged,
  subscriptionsSettled,
  tickersApplied,
  KrakenTick,
  SocketStatus,
} from './coinsSlice';

// Overridable so e2e can point the app at a stub socket.
const WS_URL =
  process.env.EXPO_PUBLIC_KRAKEN_WS_URL ?? 'wss://ws.kraken.com/v2';
const FLUSH_MS = 250; // coalesce ticks into at most one dispatch per 250ms

// Kraken heartbeats about every second when nothing else is flowing, so silence
// this long means the connection is dead in a way it has not told us about —
// the failure a price screen must never render as "Live". The watchdog tracks
// *frames*, not ticks: a quiet market is not a broken one.
const STALE_AFTER_MS = 10_000;

// How long Kraken gets to answer the subscribe. A reply that never comes is a
// symbol we are not subscribed to, and saying so beats waiting forever.
const HANDSHAKE_MS = 5000;

const MAX_BACKOFF_MS = 30_000;

// The watchdog only starts once a socket opens, so without this a transport that
// never leaves CONNECTING sits on the platform's TCP timeout saying "connecting".
const CONNECT_TIMEOUT_MS = 10_000;

interface KrakenMessage {
  channel?: string;
  // A subscribe reply — one per symbol, and `result.symbol` says which. Reading
  // only `success` is how one accepted symbol comes to speak for eight.
  method?: string;
  success?: boolean;
  result?: { symbol?: string };
  data?: { symbol: string; last: number }[];
}

// Every timer belongs to the connection that armed it: sharing one handle lets a
// replacement overwrite it, leaving the old interval running with nothing to
// clear it by.
interface Connection {
  socket: WebSocket;
  generation: number;
  flushTimer: ReturnType<typeof setInterval> | null;
  staleTimer: ReturnType<typeof setTimeout> | null;
  handshakeTimer: ReturnType<typeof setTimeout> | null;
  connectTimer: ReturnType<typeof setTimeout> | null;
}

// "BTC/USD" -> "BTC", the form the store is keyed by.
const baseOf = (pair: string) => pair.split('/')[0];

// Jittered, so a Kraken-side blip does not bring every client back in lockstep.
const jittered = (ms: number) => ms / 2 + Math.random() * (ms / 2);

export function startKrakenTicker(
  symbols: string[],
  dispatch: AppDispatch,
): () => void {
  const pairs = symbols.map((s) => `${s.toUpperCase()}/USD`);
  const subscribedPairs = new Set(pairs);
  const buffer = new Map<string, KrakenTick>(); // latest tick per symbol wins

  let current: Connection | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backoff = 1000;
  let stopped = false;
  let backgrounded = false;
  // Bumped per connection, so a frame from a socket we have already replaced can
  // be recognised and ignored rather than surfacing as fresh.
  let generation = 0;
  let status: SocketStatus = 'connecting';

  // Held locally and compared before dispatching: every frame proves the feed is
  // live, and re-announcing that per frame would put a dispatch on the hot path
  // the flush window exists to keep off it.
  const setStatus = (next: SocketStatus) => {
    if (status === next) return;
    status = next;
    dispatch(socketStatusChanged(next));
  };

  const flush = () => {
    if (buffer.size === 0) return;
    dispatch(tickersApplied(Array.from(buffer.values())));
    buffer.clear();
  };

  const stopTimer = (timer: ReturnType<typeof setTimeout> | null) => {
    if (timer) clearTimeout(timer);
    return null;
  };
  const isCurrent = (conn: Connection) => conn.generation === generation;

  // Unconditional: a connection's timers die with it whether or not its state
  // still matters to anyone.
  const release = (conn: Connection) => {
    if (conn.flushTimer) clearInterval(conn.flushTimer);
    conn.flushTimer = null;
    conn.staleTimer = stopTimer(conn.staleTimer);
    conn.handshakeTimer = stopTimer(conn.handshakeTimer);
    conn.connectTimer = stopTimer(conn.connectTimer);
  };

  // Armed when the socket opens, not on the first frame
  const armWatchdog = (conn: Connection) => {
    conn.staleTimer = stopTimer(conn.staleTimer);
    conn.staleTimer = setTimeout(() => {
      if (!isCurrent(conn)) return;
      setStatus('stale');
      // Say it, then fix it. Closing routes this through the reconnect path
      // rather than leaving a half-open socket frozen and believed.
      conn.socket.close();
    }, STALE_AFTER_MS);
  };

  const scheduleReconnect = () => {
    if (stopped || backgrounded) return;
    reconnectTimer = setTimeout(() => {
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      connect();
    }, jittered(backoff));
  };

  const connect = () => {
    // Handlers close over this context and its generation, not over `current`: a
    // late event from a replaced connection would otherwise act on the live one.
    const socket = new WebSocket(WS_URL);
    const conn: Connection = {
      socket,
      generation: ++generation,
      flushTimer: null,
      staleTimer: null,
      handshakeTimer: null,
      connectTimer: null,
    };

    // Retired here rather than on its close event: a foreground can beat that
    // event, and by then nothing points at the timers it armed.
    const previous = current;
    current = conn;
    if (previous) {
      release(previous);
      previous.socket.close();
    }

    // Deliberately not set back to `connecting`. That status means no feed has
    // ever arrived, so the price on screen is the REST seed and is current. After
    // a drop it is the dead socket's last, and saying "connecting" over it calls
    // it current again — so a reconnect stays `offline` until a fresh ticker.
    conn.connectTimer = setTimeout(() => socket.close(), CONNECT_TIMEOUT_MS);

    // This connection has answered for nothing yet, and the last one's verdict is
    // not its. A total refusal also closes without settling, so leaving the old
    // list in place would let a dead socket's opinion outlive it.
    dispatch(subscriptionsSettled([]));

    // Kraken answers the subscribe once per symbol. Tracking which ones are
    // still outstanding is what stops the first "yes" speaking for all of them.
    const awaiting = new Set(pairs);
    const refused = new Set<string>();

    // Both halves of the word, tracked apart because they arrive in either order.
    // `settled` is knowing which symbols we are subscribed to; `ticked` is data
    // actually flowing. An acknowledgement is only a promise to send data, and
    // one symbol trading is not a feed — until both hold, the number on screen is
    // still the REST seed and calling it live would cover for it.
    let settled = false;
    let ticked = false;
    const claimLive = () => {
      if (settled && ticked) setStatus('live');
    };

    const settle = () => {
      if (awaiting.size > 0 || !isCurrent(conn)) return;
      conn.handshakeTimer = stopTimer(conn.handshakeTimer);

      if (refused.size === pairs.length) {
        // Subscribed to nothing. The transport is fine and useless; close it and
        // let the backoff decide when to try again — without resetting it.
        socket.close();
        return;
      }

      backoff = 1000; // at least one symbol is genuinely subscribed
      dispatch(subscriptionsSettled([...refused].map(baseOf)));
      settled = true;
      claimLive();
    };

    socket.onopen = () => {
      // A socket still connecting when it was retired can open afterwards, and
      // everything below this line arms a timer or claims the feed.
      if (!isCurrent(conn)) return;

      // Deliberately not live yet, and the backoff stays where it is: an open
      // transport says nothing about whether Kraken accepted the subscription.
      // A server that accepts and immediately closes would otherwise reset the
      // backoff every cycle and spin at one reconnect a second.
      socket.send(
        JSON.stringify({
          method: 'subscribe',
          params: { channel: 'ticker', symbol: pairs },
        }),
      );
      conn.connectTimer = stopTimer(conn.connectTimer);
      conn.flushTimer = setInterval(flush, FLUSH_MS);
      armWatchdog(conn);

      conn.handshakeTimer = setTimeout(() => {
        if (awaiting.size === 0) return;
        // Silence is an answer: a symbol Kraken never replied for is one we are
        // not receiving, and the row should say so rather than show a price that
        // stopped moving without explanation.
        for (const pair of awaiting) refused.add(pair);
        awaiting.clear();
        settle();
      }, HANDSHAKE_MS);
    };

    socket.onmessage = (event) => {
      if (!isCurrent(conn)) return;

      let msg: KrakenMessage;
      try {
        msg = JSON.parse((event as { data: string }).data);
      } catch {
        return;
      }

      armWatchdog(conn);

      if (msg.method === 'subscribe') {
        const pair = msg.result?.symbol;
        // Without a symbol there is no telling who was answered for; the
        // handshake deadline is what covers this rather than a guess.
        if (!pair || !awaiting.delete(pair)) return;
        if (!msg.success) refused.add(pair);
        settle();
        return;
      }

      if (msg.channel !== 'ticker' || !Array.isArray(msg.data)) return;
      ticked = true;
      claimLive(); // also what un-stales the feed after silence
      for (const t of msg.data) {
        // Checked, not trusted: the frame is JSON off a socket. A price that is
        // not a finite number reaches chart geometry and draws nothing at all,
        // and a symbol we never subscribed to has no row to reach — it would
        // just accumulate in the store under a key nobody reads.
        if (!subscribedPairs.has(t?.symbol) || !Number.isFinite(t?.last)) {
          continue;
        }
        const base = baseOf(t.symbol);
        buffer.set(base, { symbol: base, last: t.last });
      }
    };

    socket.onclose = () => {
      release(conn);
      // The generation gates what this connection may still say, never whether it
      // cleans up.
      if (!isCurrent(conn)) return;
      setStatus('offline');
      // Anything still buffered belongs to a dead connection; flushing it after
      // the reconnect would present a pre-drop price as a current one.
      buffer.clear();
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  };

  // A backgrounded app is not a user watching prices. The OS may suspend or kill
  // the socket anyway, and retrying against a suspended radio just spends
  // battery to arrive at a price nobody read. `inactive` is deliberately not
  // handled: it is the app switcher and notification shade, and tearing the feed
  // down for a glance would reconnect on every one.
  const unsubscribeAppState = subscribeAppState((next) => {
    if (next === 'background' && !backgrounded) {
      backgrounded = true;
      reconnectTimer = stopTimer(reconnectTimer);
      if (current) {
        release(current);
        current.socket.close();
      }
      return;
    }

    if (next === 'active' && backgrounded) {
      backgrounded = false;
      // A foreground is fresh intent, not the next step of a retry storm, and
      // whatever is on screen is as old as the time spent away.
      backoff = 1000;
      connect();
    }
  });

  connect();

  return () => {
    stopped = true;
    unsubscribeAppState();
    reconnectTimer = stopTimer(reconnectTimer);
    buffer.clear();
    if (current) {
      release(current);
      current.socket.close();
    }
  };
}
