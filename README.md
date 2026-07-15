# Kraken Price Watcher

[![CI](https://github.com/MReintop/kraken-price-watcher/actions/workflows/ci.yml/badge.svg)](https://github.com/MReintop/kraken-price-watcher/actions/workflows/ci.yml)

A small cross-platform crypto price watcher built with **Expo** and **React Native**. It streams live prices from the Kraken WebSocket, shows a list of major coins, and drills into a candlestick chart per coin.

## Features

- **Live prices** — real-time ticker updates over the [Kraken WebSocket v2](https://docs.kraken.com/websockets-v2/) (`ticker` channel), coalesced and applied to the store.
- **Market list** — 8 major coins (BTC, ETH, SOL, ADA, XRP, DOGE, DOT, LINK), seeded from Kraken's REST `/Ticker` with identity and market context from the [CoinGecko API](https://www.coingecko.com/en/api).
- **Candlestick chart** — per-coin OHLC candles (Kraken `/OHLC`) rendered with `react-native-svg`, across three timeframes (24H / 1M / 1Y). The live price folds into the most recent candle so the right edge moves in real time.
- **Prices that don't lie** — the header shows the last trade, never a tween towards it; an up/down tick indicator carries the movement instead, because every intermediate frame of an interpolated price is a number that was never traded.
- **Polished UI** — pull-to-refresh, a shared dark theme, and reduced motion honoured throughout.

Every price — seed, tick and candle — comes from Kraken, so the number never jumps sources. [docs/store.md](docs/store.md) explains the split and the one Kraken field that looks usable and isn't.

## Tech stack

| Area       | Choice                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| Framework  | Expo SDK 57, React Native 0.86, React 19                                    |
| Language   | TypeScript                                                                  |
| State      | Redux Toolkit + React-Redux (with a listener middleware driving the socket) |
| Navigation | React Navigation (native stack)                                             |
| Charts     | react-native-svg (custom candlestick renderer)                              |
| Testing    | Jest (two-project setup) + Testing Library, Maestro for e2e                 |

## Getting started

```bash
npm install

npm start      # Expo dev server (choose a target)
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # web (react-native-web)
```

## Testing

```bash
npm test              # jest: unit + component, ~4s
npm run test:coverage # + coverage report → coverage/
npm run check:bundle  # bundle size budget
npx tsc --noEmit      # typecheck
npm run lint          # ESLint

npm run stub          # fake upstream for the flows below
npm run test:e2e:stub # maestro against the stub
npm run test:e2e      # maestro against the real Kraken
```

Three layers, each answering what nothing cheaper can:

| Layer         | Tool                                              | Covers                                                                                                                                |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**      | Jest (logic, node)                                | Pure logic with real edges: chart geometry, price formatting, Kraken's response quirks, the socket's coalescing and reconnect backoff |
| **Component** | Jest (jsdom + react-native-web) + Testing Library | Components on a real store with real dispatch. Most of the confidence lives here — including accessibility and render counts          |
| **E2E**       | Maestro                                           | Navigation across real screens, on a real bundle, on an emulator, with a socket tick reaching the UI                                  |

Jest runs the first two as separate projects, both bypassing the `jest-expo` preset. **The file extension routes the test** — `.test.ts` to node, `.test.tsx` to jsdom.

### Accessibility

There's no axe for React Native and no WCAG for React Native — WCAG is a web standard, and a native tree has no DOM to audit. So the audit the web app runs in one Playwright call is rebuilt out of parts, further down the pyramid: contrast ratios computed over `theme.ts` directly, labels and roles asserted per component, reduced motion tested at the hook and at the components that honour it.

The e2e layer contributes here too, which is part of why Maestro was chosen: **it selects through the accessibility layer**, so an unlabelled element is invisible to it and every flow is also an accessibility smoke test. Detox's `by.id(testID)` would happily address elements no screen reader can see.

Two purpose-built a11y tools were evaluated and rejected on dependency grounds — [docs/testing.md](docs/testing.md) names them and why. None of this substitutes for a VoiceOver/TalkBack pass.

### Performance

Counted, not timed. Wall-clock assertions in CI are worthless: a threshold loose enough not to flake is loose enough to catch nothing — the sibling web app had a "no jank under load" test that passed identically with the coalescing removed entirely.

So: React `Profiler` render counts assert that one coin's tick re-renders one row and that a repeated price re-renders nothing, and `npm run check:bundle` asserts the exported bundle against a ratcheted budget. Maestro measures no performance and doesn't pretend to.

Why Maestro over Detox, and the costs of that choice, are in [docs/testing.md](docs/testing.md).

## Project structure

```
components/   UI components (coin card, candlestick chart, header, stats, …)
screens/      PricesScreen (list) and CoinDetailScreen (chart)
store/        Redux slice, Kraken socket, listener middleware
hooks/        useCandles (OHLC per coin), useReducedMotion
lib/          upstream clients, chart geometry, price formatting, tracked coins
.maestro/     e2e flows
e2e/stub/     fake CoinGecko + Kraken, for deterministic flows
docs/         the reasoning behind the store and the tests
theme.ts      design tokens + gain/loss color helper
```

> Data is provided by public CoinGecko and Kraken endpoints. This is a demo project and not financial advice.
