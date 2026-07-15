This is **kraken-price-watcher** — a React Native application, built with Expo.
Its sibling **kraken-price-watcher-web** is the React + Next.js one; don't apply its web conventions here.

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Conventions

## Props get a named interface

A component taking props declares an `interface` named after it — `CoinHeaderProps`, `LiveBadgeProps` — even for a single prop. Not an inline object literal after the destructure, and **never a bare `Props`**: every file would declare a different type under the same name, so the name says nothing at a call site and greps for it are useless.

## Prices go through `lib/formatPrice.ts`

Never `toLocaleString()` on a price directly. The locale is pinned there, and the decimal count is magnitude-based so an animating number can't flicker its decimals mid-tween — both are lost the moment a call site formats its own.
