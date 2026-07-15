# The store

One slice, `coins`, holding the eight tracked coins plus the socket's liveness. A listener middleware opens the Kraken socket once the first fetch reveals the symbol set. That's the whole design; the rest of this file is about the parts that look wrong until you know why.

## Where the price comes from

Two upstreams, split by what each is good for:

- **CoinGecko** — identity and market context: name, symbol, image, market cap, 24h volume, and **the 24h change**.
- **Kraken** — every price: the REST `/Ticker` seed, the socket ticks, and the candles.

The price never changes source, so it never jumps. The division is enforced in `lib/coins.ts`.

**The 24h change is CoinGecko's on purpose.** Kraken's Ticker exposes `o`, which reads like "the price 24h ago" and is not — it's **today's open**, reset at midnight UTC. Deriving the change from it makes every coin agree with the clock rather than the market: mid-morning UTC the whole list drifts a percent or two the same way. The socket then corrects each coin about 250ms later, so the wrong number is on screen only for the first frame and never appears in a test that waits for content. `o` is deliberately left unread.

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

Send a lower-case symbol and the `.find()` misses, the reducer does nothing, no error is thrown, and the price simply stops updating while the socket stays green. There is no failure mode louder than "the number went still." If prices are frozen but the badge says live, check the case first.

## Why the socket starts in middleware

The socket needs the symbol set, and the symbol set only exists after the first successful fetch — so `listenerMiddleware.ts` starts it on `fetchCoins.fulfilled`, then unsubscribes so a pull-to-refresh doesn't open a second one.

Starting it in a component's effect instead would tie the connection's lifetime to that component's mount, and reconnect it on every remount. The middleware is the only place that sees the data arrive without being a view.
