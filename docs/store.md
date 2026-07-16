# The store

One slice, `coins`, holding the eight tracked coins plus the health of the feed. A listener middleware opens the Kraken socket as soon as the app asks for coins. That's the whole design; the rest of this file is about the parts that look wrong until you know why.

## Where the price comes from

Three sources, split by what each is good for — and, more importantly, by what the app can survive losing:

- **`lib/trackedCoins.json`** — identity: id, display name, symbol, Kraken pair. Local, so it cannot fail.
- **Kraken** — every price: the REST `/Ticker` seed, the socket ticks, and the candles.
- **CoinGecko** — market context: image, market cap, 24h volume, and **the 24h change**.

The price never changes source, so it never jumps. The division is enforced in `lib/coins.ts`.

**Identity being local is what makes the other two independent.** A row needs a name, a symbol and a price to be worth rendering; two of those three are on disk. So Kraken decides whether there is a market to show, and CoinGecko only decorates it — which is why `fetchCoins()` joins them with `Promise.allSettled` and not `Promise.all`. `Promise.all` gave an artwork API a veto over every price on screen.

A Kraken failure rejects the thunk: no prices, no market, error view. A CoinGecko failure resolves — prices render, the 24h pill is omitted rather than shown as a flat `0.00%`, and the stats card says `Market context unavailable`. `PricesScreen.test.tsx` fails CoinGecko while Kraken stays healthy and asserts the prices are still there and still ticking.

**Missing context is read off the coin, not off a flag.** There is no `contextAvailable` in the slice: with eight fixed instruments, "CoinGecko is down" and "this coin has no context" coincide, so a flag would be a second source of truth for what `market_cap == null` already says — and one the rendered card could drift from.

**`lib/coins.ts` lists CoinGecko's fields one by one instead of spreading the response.** The body is cast, not validated, so it arrives carrying its own `id`, `name` and `symbol` no matter what the type says. A spread put those over the registry's, and identity silently changed source depending on whether CoinGecko answered — the same bug the price split exists to prevent, one field over.

**The 24h change is CoinGecko's on purpose**, and two Kraken fields are deliberately left unread to keep it that way.

`o` on the REST Ticker reads like "the price 24h ago" and is not — it's **today's open**, reset at midnight UTC. Deriving the change from it makes every coin agree with the clock rather than the market: mid-morning UTC the whole list drifts a percent or two the same way. The socket then corrected each coin about 250ms later, so the wrong number was on screen only for the first frame and never appeared in a test that waited for content.

`change_pct` on the socket frame is a subtler version of the same trap. It is a true 24h figure, so it looks safe — but it is **Kraken's own spot market**, while the seeded number is CoinGecko's **cross-exchange** one. Same window, different venue. Reading it swapped the source under the label on the first tick, which is the thing this split exists to prevent. `KrakenTick` therefore carries a price and nothing else.

## What "live" means

`socket` is a state, not a boolean: `connecting | live | stale | offline`.

**`live` is the claim that has to be earned.** An open transport says nothing — Kraken answers a subscribe **once per symbol**, so the socket waits for every one before claiming live, and a symbol it refuses or never answers for lands in `unavailable`.

`unavailable` is not bookkeeping: a refused symbol keeps its REST seed on screen, which looks exactly like a market that isn't moving. So the row says `Not updating` and the header counts the shortfall — `Degraded 7/8`, never a bare `Live`. `PricesScreen.test.tsx` drives a partial refusal through the store and asserts both, because the socket's own tests can only prove the action was dispatched, not that anything listens.

**The header counts refusals against the rows that exist, not against `unavailable.length`.** The socket subscribes from the registry while `items` holds whatever Kraken priced, so the two sets can differ: a symbol refused by the socket may have no row at all, and counting it reports a shortfall against a total it was never part of — `Degraded 0/1` while the one visible coin is live.

**`live` needs both halves, and they arrive in either order.** `settled` is knowing which symbols we are subscribed to; `ticked` is a ticker frame actually landing. Neither alone earns the word:

- **An acknowledgement is a promise to send data, not data.** A server can accept every subscription and then only heartbeat. The price on screen is still the REST seed, so `Live` over it would be exactly the frozen-number lie the state exists to prevent.
- **One symbol trading is not a feed.** A ticker can beat the last subscribe reply, and until every symbol is answered for there is no telling what `Live` is covering for.

So `settle()` records `settled` and the ticker branch records `ticked`; whichever lands second claims the word. A ticker is also what un-stales the feed after silence, which falls out of the same rule rather than being a second path.

**`stale` is the state a boolean cannot express**: connected, believed healthy, and silently frozen. Kraken heartbeats roughly every second, so ten seconds of silence is a dead connection rather than a quiet market — the socket says so and closes it, because sitting on a half-open socket while rendering "Live" is the one failure a price screen must never have.

## Two things the web does that this app must not copy

The sibling web app (`kraken-price-watcher-web`) is the same product, and these two differences are deliberate. Both look like the RN app is behind. It isn't.

### `makeStore` factory → no, a singleton is correct here

The web exports a `makeStore()` factory because a module-level store on a server is **shared between requests** — one user's prices leak into another's render. That's not a style preference there; it's a correctness bug.

React Native has no server and no requests. One store per app process is exactly the lifetime we want, so `store/store.ts` exports a singleton. Adding a factory here would be cargo-culting a fix for a problem this app cannot have.

### `bySymbol` normalisation → no, `items[]` is fine

The web normalises prices into `bySymbol` so each row's selector returns its own object and one tick re-renders one row.

This app already has that property by a different route. `selectCoinById(id)` gives each row its own subscription, and Immer preserves object identity for the coins a tick didn't touch — so an untouched row's selector returns the identical reference and React skips it. `CoinCard.render.test.tsx` asserts exactly this, and would fail if it stopped being true.

The remaining cost is a `.find()` over eight coins per row. Normalising to buy that back would trade a real, tested property for nothing measurable.

## The invariant that fails silently

`tickersApplied` matches on **upper-case base symbol** — `BTC`, not `btc` or `BTC/USD`. `store/krakenSocket.ts` builds the upper-case pairs it subscribes by, accepts a frame only for a pair it asked for, and cuts `BTC/USD` down to `BTC` on the way into the buffer; the slice then compares against `coin.symbol.toUpperCase()`.

Send a lower-case symbol and the `.find()` misses, the reducer does nothing, no error is thrown, and the price simply stops updating. There is no failure mode louder than "the number went still." If prices are frozen, check the case first.

The badge is no longer part of the lie: a symbol the socket isn't really receiving is named on its own row and counted in the header, and a feed that has gone quiet says `stale` rather than `live`.

## Why the socket starts in middleware, on `pending`

`listenerMiddleware.ts` starts the ticker on `fetchCoins.**pending**` — when the app _asks_ for coins, not when CoinGecko _answers_ — then unsubscribes so a pull-to-refresh can't open a second connection.

**The trigger is the point.** Starting on `fulfilled` made CoinGecko a prerequisite for even _opening_ the socket: rate-limited or down, the app showed an error and never connected, even though Kraken was healthy and Kraken is where every price comes from. It only reached for CoinGecko's response because it wanted the symbol set — but the symbols are local, in `lib/trackedCoins.json`.

**Starting the socket early only pays off because the rows no longer wait for CoinGecko.** `tickersApplied` resolves each tick against `items`, so an early socket feeding an empty `items` would drop every tick it received and change nothing on screen. The trigger and the `Promise.allSettled` split above are one fix in two halves; either alone is theatre.

Middleware rather than a component effect, because an effect ties the connection's lifetime to a mount and reconnects on every remount. The middleware sees the app start without being a view.

## Candles: selected first, then the rest

`useCandles(coinId, timeframe)` fetches **the range being looked at, alone**, and prefetches the other two once it lands. The cache is keyed per coin _and_ range, so each is fetched at most once per TTL.

**Eager was the wrong default, but for a subtler reason than it looks.** Fetching all three up front doesn't cost more requests than lazy for someone who views all three — the cache means each range is fetched once either way. It costs more for everyone who views _one_: three requests for a glance, and 24 to browse eight coins instead of 8. And `Promise.all` fires them simultaneously, which is the burstiest pattern there is and the one most likely to trip a rate limiter.

Selected-first keeps the instant switching that made eager attractive — by the time a user reaches for another range it is usually already there — while the visible chart gets the network to itself and an abandoned screen cancels what it no longer needs.

**A prefetch failure is silent on purpose.** It refetches, and reports properly, if that range is ever selected. Under `Promise.all` one failed range took down two successful ones and showed an error for all three.

## The feed follows the app to the background

The socket owns its own foreground policy (`store/krakenSocket.ts`, via the `lib/appState.ts` seam): backgrounding drops the feed and stops the retries, foregrounding reconnects immediately instead of serving out a backoff.

`inactive` is **deliberately ignored** — that's the app switcher and the notification shade, and tearing the feed down for a glance would reconnect on every one.

**NetInfo is deliberately absent.** The stale watchdog already closes a half-open socket within ten seconds whatever the cause, network changes included, so network awareness would buy battery and reconnect latency rather than correctness — at the price of a dependency.
