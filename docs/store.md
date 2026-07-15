# The store

One slice, `coins`, holding the eight tracked coins plus the health of the feed. A listener middleware opens the Kraken socket as soon as the app asks for coins. That's the whole design; the rest of this file is about the parts that look wrong until you know why.

## Where the price comes from

Two upstreams, split by what each is good for:

- **CoinGecko** — identity and market context: name, symbol, image, market cap, 24h volume, and **the 24h change**.
- **Kraken** — every price: the REST `/Ticker` seed, the socket ticks, and the candles.

The price never changes source, so it never jumps. The division is enforced in `lib/coins.ts`.

**The 24h change is CoinGecko's on purpose**, and two Kraken fields are deliberately left unread to keep it that way.

`o` on the REST Ticker reads like "the price 24h ago" and is not — it's **today's open**, reset at midnight UTC. Deriving the change from it makes every coin agree with the clock rather than the market: mid-morning UTC the whole list drifts a percent or two the same way. The socket then corrected each coin about 250ms later, so the wrong number was on screen only for the first frame and never appeared in a test that waited for content.

`change_pct` on the socket frame is a subtler version of the same trap. It is a true 24h figure, so it looks safe — but it is **Kraken's own spot market**, while the seeded number is CoinGecko's **cross-exchange** one. Same window, different venue. Reading it swapped the source under the label on the first tick, which is the thing this split exists to prevent. `KrakenTick` therefore carries a price and nothing else.

## What "live" means

`socket` is a state, not a boolean: `connecting | live | stale | offline`.

**`live` is the claim that has to be earned.** An open transport says nothing — Kraken answers a subscribe **once per symbol**, so the socket waits for every one before claiming live, and a symbol it refuses or never answers for lands in `unavailable` rather than sitting on screen as a price that quietly stopped moving.

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

`tickersApplied` matches on **upper-case base symbol** — `BTC`, not `btc` or `BTC/USD`. `lib/kraken.ts` upper-cases on the way in; the slice compares against `coin.symbol.toUpperCase()`.

Send a lower-case symbol and the `.find()` misses, the reducer does nothing, no error is thrown, and the price simply stops updating. There is no failure mode louder than "the number went still." If prices are frozen, check the case first.

The badge is no longer part of the lie, at least: a symbol the socket isn't really receiving now shows up in `unavailable`, and a feed that has gone quiet says `stale` rather than `live`.

## Why the socket starts in middleware, on `pending`

`listenerMiddleware.ts` starts the ticker on `fetchCoins.**pending**` — when the app _asks_ for coins, not when CoinGecko _answers_ — then unsubscribes so a pull-to-refresh can't open a second connection.

**The trigger is the point.** Starting on `fulfilled` made CoinGecko a hard prerequisite for Kraken: rate-limited or down, the app showed an error and never opened the socket, even though Kraken was healthy and Kraken is where every price comes from. It only reached for CoinGecko's response because it wanted the symbol set — but the symbols are local, in `lib/trackedCoins.json`. A CoinGecko failure now delays metadata and nothing else.

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
