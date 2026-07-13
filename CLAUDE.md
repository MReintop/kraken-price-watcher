@AGENTS.md

# Testing

## Runner — two Jest projects
`jest.config.js` defines two projects, both **bypassing the `jest-expo` preset** (its Expo "winter" runtime fails to load under Jest on SDK 57):

- **logic** — `*.test.ts`, `node` env, Babel type-strip. For pure functions, reducers, selectors.
- **components** — `*.test.tsx`, `jsdom` + **react-native-web**, `@testing-library/react`. For rendering RN components. The icon font (`@expo/vector-icons`) and `@react-navigation/native` are mocked under `test/mocks/`.

The `.ts` vs `.tsx` extension is what routes a test to the correct project.

Commands:
- `npm test` — run all tests
- `npm run test:coverage` — tests + coverage report (→ `coverage/`)
- `npx tsc --noEmit` — typecheck
- `npm run lint` — ESLint

## Placement / naming
- Pure logic → `X.test.ts` colocated with `X.ts`.
- Component render → `X.test.tsx` colocated with `X.tsx`.

## AAA — EVERY test follows Arrange / Act / Assert
Structure every test with the three labeled sections. Use a `makeX(overrides)` builder for **Arrange** so each test states only the field under test. Name the **Act** result `result`. Canonical example: `components/coinCard/CoinCardUtils.test.ts`.

```ts
it('marks a negative change as down + red', () => {
  // Arrange
  const coin = makeCoin({ price_change_percentage_24h: -1.45 });

  // Act
  const result = getCoinDetails(coin);

  // Assert
  expect(result.isUp).toBe(false);
  expect(result.color).toBe('#dc2626');
});
```

## Component tests
Wrap the component in a Redux `<Provider>` with a **preloaded** store, query with `@testing-library/react` (`screen.getByText` / `getByRole`), and press with `fireEvent.click`. Example: `components/coinCard/CoinCard.test.tsx`.

## Gotcha — do NOT use `@testing-library/react-native`
RNTL / `react-test-renderer` do not work on this SDK (the renderer returns an empty tree). Render RN components through **react-native-web in jsdom** instead — that's what the `components` project does.
