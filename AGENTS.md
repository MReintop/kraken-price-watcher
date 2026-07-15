This is **kraken-price-watcher** — a React Native application, built with Expo.
Its sibling **kraken-price-watcher-web** is the React + Next.js one; don't apply its web conventions here. Where the two apps deliberately differ, [docs/store.md](docs/store.md) says why.

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Guides — read the relevant one before you touch that area

These are not optional background. Each documents decisions that are invisible in the code and that fail silently when broken.

- **[docs/store.md](docs/store.md)** — read before touching `store/`, `lib/coins.ts`, or anything reading prices. Covers the CoinGecko/Kraken split and why the 24h change comes from CoinGecko, why the store is a singleton and `items[]` is not normalised (both deliberate divergences from the web), the UPPERCASE symbol contract that freezes prices with no error when broken, and why the socket starts in middleware.
- **[docs/testing.md](docs/testing.md)** — read before writing or changing a test. Covers the mandatory Arrange–Act–Assert format, the two Jest projects and why the file extension routes the test, why Redux is tested through components, why Maestro over Detox, why accessibility auditing sits in component tests rather than e2e, and why performance is counted rather than timed.

# Conventions

- **Formatting is prettier's job, correctness is eslint's.** Don't hand-format, and don't add stylistic eslint rules — `eslint-config-prettier` turns them off on purpose.
- **Hooks run automatically:** `pre-commit` runs prettier + eslint over staged files. Don't `--no-verify` around a failure; fix it.

## Props get a named interface

A component taking props declares an `interface` named after it — `CoinHeaderProps`, `LiveBadgeProps` — even for a single prop. Not an inline object literal after the destructure, and **never a bare `Props`**: every file would declare a different type under the same name, so the name says nothing at a call site and greps for it are useless.

## Prices go through `lib/formatPrice.ts`

Never `toLocaleString()` on a price directly. The locale is pinned there, and the decimal count is magnitude-based so an animating number can't flicker its decimals mid-tween — both are lost the moment a call site formats its own.

## Coins come from `lib/trackedCoins.json`

The id→pair mapping lives in one file, read by `lib/coins.ts` and by the e2e stub. Adding a coin means editing that file and nothing else.

## Comments: last resort, local, short

Write code that doesn't need explaining. Reach for a better name before reaching for a comment — if a comment says _what_ something is, that's a naming bug.

When a comment is genuinely necessary:

- **Local only.** It describes the file it sits in. No pointers to other files, other apps this was ported from, past bugs, previous approaches, or why an alternative was rejected. That context belongs in `docs/`, the PR, or the commit message — it goes stale in code and it's noise to the next reader.
- **Explain, don't narrate.** Worth writing: a constraint the code can't express, a non-obvious consequence, an external data format, a deliberate trade-off. Not worth writing: restating the next line, section banners, architecture tours, or notes to the reviewer.
- **Short.** One line, two at most. If it needs a paragraph, either the code needs better names or the reasoning belongs in `docs/`.

The only mandated comments are the `// Arrange` / `// Act` / `// Assert` markers in tests — see [docs/testing.md](docs/testing.md).
