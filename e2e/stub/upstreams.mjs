// Stands in for both upstreams: CoinGecko under /coingecko, Kraken REST under
// /kraken, and Kraken's ticker socket on the same port. Every response derives
// from fixed seeds — no clock, no randomness, identical bytes on every run.
//
// Maestro cannot mock a socket the way a browser test can, so determinism has to
// come from the app talking to this instead of the real Kraken.
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';

// The same list the app uses. A second copy here would drift the moment a coin
// is added, and the stub would 404 a pair the app asks for.
const TRACKED = JSON.parse(
  readFileSync(new URL('../../lib/trackedCoins.json', import.meta.url), 'utf8'),
);
const pairFor = (id) => TRACKED.find((coin) => coin.id === id).pair;

const PORT = Number(process.env.STUB_PORT ?? 4001);
const TICK_MS = Number(process.env.STUB_TICK_MS ?? 1000);

const COINS = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'btc',
    price: 62888,
    change24h: -1.45,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'eth',
    price: 1883.21,
    change24h: 2.5,
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'sol',
    price: 142.5,
    change24h: 5.1,
  },
  {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ada',
    price: 0.38,
    change24h: -0.75,
  },
  {
    id: 'ripple',
    name: 'XRP',
    symbol: 'xrp',
    price: 0.52,
    change24h: 1.2,
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'doge',
    price: 0.12,
    change24h: -3.4,
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    symbol: 'dot',
    price: 4.15,
    change24h: 0.9,
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    symbol: 'link',
    price: 11.3,
    change24h: 4.2,
  },
];

const round = (n) => Math.round(n * 100) / 100;

// CoinGecko: identity only. Prices here are deliberately absent — the app takes
// them from Kraken.
const withPair = (coin) => ({ ...coin, pair: pairFor(coin.id) });

const markets = () =>
  COINS.map((coin) => ({
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    image: `http://localhost:${PORT}/icon/${coin.id}.png`,
    market_cap: 1_000_000,
    total_volume: 500_000,
    price_change_percentage_24h: coin.change24h,
  }));

// Kraken /Ticker: `c` is [last, lotVolume], `o` is the 24h open. Prices are
// strings, as the real API sends them.
const ticker = (requested) => {
  const wanted = new Set(requested.split(','));
  return Object.fromEntries(
    COINS.map(withPair)
      .filter((coin) => wanted.has(coin.pair))
      .map((coin) => [coin.pair, { c: [String(coin.price), '1.0'] }]),
  );
};

// Kraken /OHLC: [timeSeconds, open, high, low, close, vwap, volume, count].
// A sine walk around the coin's price, anchored to a fixed epoch so the x-axis
// labels never move.
const EPOCH_SECONDS = Date.UTC(2026, 0, 1) / 1000;

const ohlc = (pair, interval) => {
  const coin = COINS.map(withPair).find((entry) => entry.pair === pair);
  if (!coin) return null;
  const count = 60;
  const stepSeconds = interval * 60;
  const base = coin.price;

  const rows = Array.from({ length: count }, (_, i) => {
    const open = base + Math.sin(i / 3) * base * 0.02;
    const close = base + Math.sin((i + 1) / 3) * base * 0.02;
    return [
      EPOCH_SECONDS + i * stepSeconds,
      String(round(open)),
      String(round(Math.max(open, close) + base * 0.005)),
      String(round(Math.min(open, close) - base * 0.005)),
      String(round(close)),
      String(round(open)),
      '1.0',
      10,
    ];
  });

  return { [pair]: rows, last: EPOCH_SECONDS };
};

export function createStubServer() {
  return createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const json = (body) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    // Kraken reports failure as HTTP 200 with a populated error array.
    const krakenError = (message) => json({ error: [message], result: {} });

    if (url.pathname === '/coingecko/coins/markets') return json(markets());

    if (url.pathname === '/kraken/Ticker') {
      const pair = url.searchParams.get('pair');
      if (!pair) return krakenError('EGeneral:Invalid arguments');
      return json({ error: [], result: ticker(pair) });
    }

    if (url.pathname === '/kraken/OHLC') {
      const pair = url.searchParams.get('pair');
      const interval = Number(url.searchParams.get('interval') ?? 1440);
      const result = ohlc(pair, interval);
      if (!result) return krakenError('EQuery:Unknown asset pair');
      return json({ error: [], result });
    }

    // 1x1 transparent gif, so coin icons resolve without hitting the network.
    // Timing-Allow-Origin, or the browser reports transferSize 0 for these and
    // the byte budgets in performance.spec.ts silently stop seeing them.
    if (url.pathname.startsWith('/icon/')) {
      res.writeHead(200, {
        'content-type': 'image/gif',
        'timing-allow-origin': '*',
      });
      return res.end(
        Buffer.from(
          'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          'base64',
        ),
      );
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found', path: url.pathname }));
  });
}

// Prices walk a fixed sequence so a flow can assert an exact value after N ticks.
const tickPrice = (coin, step) =>
  round(coin.price + step * (coin.price * 0.001));

function attachTickerSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    let step = 0;
    let subscribed = [];

    socket.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      if (message.method === 'subscribe') {
        subscribed = message.params.symbol;
      }
    });

    const timer = setInterval(() => {
      if (subscribed.length === 0) return;
      step += 1;
      const data = subscribed.flatMap((pair) => {
        const base = pair.split('/')[0];
        const coin = COINS.find((c) => c.symbol.toUpperCase() === base);
        if (!coin) return [];
        return [{ symbol: pair, last: tickPrice(coin, step), change_pct: 1.5 }];
      });
      socket.send(JSON.stringify({ channel: 'ticker', data }));
    }, TICK_MS);

    socket.on('close', () => clearInterval(timer));
  });
}

const server = createStubServer();
attachTickerSocket(server);
server.listen(PORT, () => {
  console.log(`[stub] upstreams on http://localhost:${PORT}`);
  console.log(`[stub] ticker socket on ws://localhost:${PORT}/ws`);
});
