# Kraken Price Watcher

[![CI](https://github.com/MReintop/kraken-price-watcher/actions/workflows/ci.yml/badge.svg)](https://github.com/MReintop/kraken-price-watcher/actions/workflows/ci.yml)

A small cross-platform crypto price watcher built with **Expo** and **React Native**. It streams live prices from the Kraken WebSocket, shows a list of major coins, and drills into a candlestick chart per coin.

## Features

- **Live prices** — real-time ticker updates over the [Kraken WebSocket v2](https://docs.kraken.com/websockets-v2/) (`ticker` channel), coalesced and applied to the store.
- **Market list** — 8 major coins (BTC, ETH, SOL, ADA, XRP, DOGE, DOT, LINK) with market cap and 24h volume from the [CoinGecko API](https://www.coingecko.com/en/api).
- **Candlestick chart** — per-coin OHLC candles (CoinGecko `/ohlc`) rendered with `react-native-svg`, across three timeframes (24H / 1M / 1Y). The live price folds into the most recent candle so the right edge moves in real time.
- **Polished UI** — animated price transitions, an up/down tick indicator, pull-to-refresh, and a shared dark theme.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, React 19 |
| Language | TypeScript |
| State | Redux Toolkit + React-Redux (with a listener middleware driving the socket) |
| Navigation | React Navigation (native stack) |
| Charts | react-native-svg (custom candlestick renderer) |
| Testing | Jest (two-project setup) + Testing Library |

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
npm test           # run all tests
npm run test:coverage  # tests + coverage report → coverage/
npx tsc --noEmit   # typecheck
npm run lint       # ESLint
```

Jest runs two projects (both bypass the `jest-expo` preset):

- **logic** (`*.test.ts`, node env) — pure functions, reducers, selectors.
- **components** (`*.test.tsx`, jsdom + react-native-web) — RN component rendering via Testing Library.

## Project structure

```
components/   UI components (coin card, candlestick chart, header, stats, …)
screens/      PricesScreen (list) and CoinDetailScreen (chart)
store/        Redux slice, Kraken socket, listener middleware
hooks/        useCandles — fetches & caches OHLC per coin
lib/          pure chart geometry + price formatting
theme.ts      design tokens + gain/loss color helper
```

> Data is provided by public CoinGecko and Kraken endpoints. This is a demo project and not financial advice.
