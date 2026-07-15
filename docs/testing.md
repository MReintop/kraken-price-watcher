# Testing

## Arrange–Act–Assert

Every test — unit, component **and Maestro flow** — is written as **Arrange–Act–Assert**, with `// Arrange`, `// Act`, `// Assert` comments marking the three sections.

- Collapse to a single `// Arrange / Act` when setup and the call under test are one line.
- If a section is empty, say why rather than dropping the marker — `// Arrange (fetch stubbed above)`.
- One behaviour per test. A second Act means a second test.
- Shared setup goes in a named builder (`makeCoin(overrides)`, `renderWithStore`) so Arrange stays one line and each test states only the field under test.
- Name the Act result `result`.

Canonical example: `components/coinCard/CoinCardUtils.test.ts`.

```ts
it('marks a negative change as down + red', () => {
  // Arrange
  const coin = makeCoin({ price_change_percentage_24h: -1.45 });

  // Act
  const result = getCoinDetails(coin);

  // Assert
  expect(result.isUp).toBe(false);
  expect(result.changeLabel).toContain('▼');
});
```

In a Maestro flow the markers matter more than anywhere else: nothing in YAML distinguishes a setup tap from the tap under test — `tapOn` looks identical either way. The comments are the only thing that says which is which.

## The runner: two Jest projects

`jest.config.js` defines two projects, neither using an Expo preset — `jest-expo`'s "winter" runtime fails to load under Jest on SDK 57, so both configure their own transform.

| Project        | Matches      | Env                                                  | For                                 |
| -------------- | ------------ | ---------------------------------------------------- | ----------------------------------- |
| **logic**      | `*.test.ts`  | `node`, Babel type-strip                             | pure functions, reducers, selectors |
| **components** | `*.test.tsx` | `jsdom` + react-native-web, `@testing-library/react` | rendering RN components             |

**The file extension routes the test.** A component test named `.ts` lands in the node project and fails on the first import with an error that says nothing about the cause. This is why `theme.contrast.test.tsx` carries a `.tsx` it doesn't otherwise need.

**Do not use `@testing-library/react-native`.** RNTL and `react-test-renderer` are broken on this SDK — the renderer returns an empty tree, so every query fails with "unable to find" and looks like your component is wrong. Render through react-native-web in jsdom instead. Both packages are uninstalled deliberately; reinstalling one will appear to work right up until the tree comes back empty.

**`test/setupComponents.ts` stubs `window.matchMedia`, and that is load-bearing.** jsdom doesn't implement it, and react-native-web reads `prefers-reduced-motion` through it — resolving **`true`** when it's absent. Without the stub, every animated component silently tests its reduced-motion path instead of the one it claims to, flipping a microtask into the test rather than at render. The symptom is an `act(...)` warning; the disease is a suite asserting the wrong branch. Never treat those warnings as noise.

Components whose behaviour depends on the setting mock `useReducedMotion` outright, so the branch under test is stated rather than inherited from the environment. The OS query is asynchronous and leaves the process, which is exactly what the mocking rule above covers.

`jest` and `jest-environment-jsdom` are declared directly. They used to arrive only as transitive dependencies of `jest-expo` — so the suite that exists to avoid that preset silently required it to be installed, and removing it took the runner and the jsdom environment with it. Keep both explicit.

## Which kind of test to write

| Layer         | Tool                    | Lives in                            | Covers                                                                                                                                                                                                                                        |
| ------------- | ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**      | Jest (logic)            | `lib/`, `store/`                    | Pure logic with real edges: chart geometry, price formatting, Kraken's response quirks, the socket's coalescing and backoff (fake `WebSocket` + fake timers).                                                                                 |
| **Component** | Jest (components) + RTL | `components/`, `screens/`, `hooks/` | Components wired to their real collaborators: real store, real dispatch, real children. Stub only what leaves the process (`fetch`, the socket, navigation). **Most confidence comes from here** — including accessibility and render counts. |
| **E2E**       | Maestro                 | `.maestro/*.yaml`                   | What nothing cheaper can see: navigation between real screens, the app against a real bundle on a real emulator, a socket tick reaching the UI.                                                                                               |

Pick the cheapest test that can answer the question. Don't reach for a flow when a component test answers the same thing — a Maestro run costs an emulator boot and about ten minutes of CI; the component suite is 3 seconds.

## Redux: test the slice through the components that use it

Per [the Redux testing guide](https://redux.js.org/usage/writing-tests): the end user doesn't know or care whether Redux is used at all, so it's an implementation detail.

- **Don't** unit-test reducers, selectors or action creators in isolation. Render a `<Provider>` with a real store, dispatch real actions, assert the **UI** changed. The test then survives a refactor of the state shape instead of failing falsely.
- **Never** mock selectors or the react-redux hooks. Mock at the network boundary (`fetch`) or the module boundary (`store/krakenSocket`).
- **The exception the guide allows** is genuinely complex logic. `store/listenerMiddleware.test.ts` is tested directly for that reason; ordinary merge and lookup logic is not complex and goes through a component.

Worked examples: `PricesScreen.test.tsx` covers `fetchCoins`, `tickersApplied` and `socketStatusChanged` by dispatching into a real store and asserting the rendered list.

## Accessibility lives in component tests, not e2e

On the web, accessibility is audited in Playwright with `makeAxeBuilder` — one call, the whole WCAG 2.1 AA ruleset, on the real rendered page.

**There is no axe for React Native, and there is no WCAG for React Native.** WCAG is a web standard; a native tree has no DOM to audit and no equivalent conformance target. So the audit that sits at the top of the web's pyramid has to be rebuilt further down, out of parts:

- **Contrast** — `theme.contrast.test.tsx` computes WCAG contrast ratios over `theme.ts` directly. This is the one part of WCAG that transfers cleanly, because it's about colour, not markup.
- **Labels and roles** — asserted per component in its own test, via the `accessibilityLabel` / `accessibilityRole` props.
- **Reduced motion** — `useReducedMotion` is tested directly, and the animated components are tested for honouring it.
- **The chart's summary** — `describeCandles` is a pure function with its own tests, and `CandlestickChart.test.tsx` asserts it actually reaches the tree. An SVG of rectangles says nothing to a screen reader, and reading thirty candles one by one would be worse than silence; the summary carries what a sighted user takes in at a glance — range, direction, extremes — as one node.
- **Maestro flows** — a de-facto smoke test, because Maestro selects through the accessibility layer (below). An unlabelled element is invisible to it.

**Two tools were evaluated and rejected**, both on dependency grounds rather than merit:

- `react-native-accessibility-engine` — the closest analogue to axe, explicitly modelled on it. Requires `react@^19.2.7`; SDK 57 pins `19.2.3`. It also runs on `react-test-renderer`, which is the broken renderer above — so even forced past the peer check it would assert against an empty tree.
- `eslint-plugin-react-native-a11y` — peers `eslint <=8`; this repo is on 9.

Both would install under `--legacy-peer-deps`. Neither would work, and the failure mode of the first is a green suite that inspects nothing. Left out on purpose.

**No tool substitutes for a VoiceOver/TalkBack pass.** Do one before claiming a screen is accessible.

## Performance: count things, don't time them

Wall-clock assertions in CI are worthless — a threshold loose enough not to flake is loose enough to catch nothing. The web app proved this the hard way: a "no long tasks under load" test passed identically with the socket's coalescing removed entirely. It asserted nothing and was deleted.

So we assert counts and bytes, which are deterministic:

- **Render counts** — React's `Profiler` is renderer-agnostic, so the web's approach ports as-is. `CoinCard.render.test.tsx` asserts that a tick for one symbol re-renders only that symbol's row, and that a tick repeating the current price re-renders nothing.
- **Bundle size** — `npm run check:bundle` runs `expo export` and asserts the emitted bundle against a budget ratcheted just above current. One stray import of a heavy library is invisible until measured. Raise the budget deliberately and with a reason; a number that only ever goes up is not a budget.
- **Nothing in e2e.** Maestro measures no performance and we don't pretend it does.

## E2E: why Maestro, not Detox

The real question for this app, not the generic comparison:

1. **Detox's headline feature buys nothing here.** Detox's value is grey-box auto-waiting — it watches the JS thread, the native UI queue and the network, and acts only when idle. But it **cannot observe a WebSocket push**; Detox's own docs name that as the case where you fall back to manual `waitFor(...).withTimeout(...)`. A live ticker's core flow is exactly that, so we'd pay Detox's setup cost and hand-write the waits anyway.
2. **Maestro drives through the accessibility layer**, and that's a feature given the section above. An element with no accessible label is invisible to Maestro, so writing a flow forces a label and the suite doubles as an accessibility smoke test. Detox's `by.id(testID)` happily addresses elements no screen reader can see.
3. **Expo's tooling has standardised on Maestro** — first-class EAS Workflows support and a Maestro dashboard.

**The costs, honestly:** YAML flows, so no type safety and no sharing helpers with the app; and Maestro cannot mock the socket, so determinism has to come from the stub rather than from an interception API like Playwright's `routeWebSocket`.

**Every flow selects by accessible text or label.** That's the entire point of the choice — a `testID` selector would give the tool back the blindness we picked it to avoid.

## The stub

Maestro can't intercept anything, so determinism comes from pointing the app at a fake upstream: `e2e/stub/upstreams.mjs` serves CoinGecko `/coins/markets`, Kraken `/Ticker` and `/OHLC` from fixed seeds, plus a WebSocket that walks prices. It reads `lib/trackedCoins.json`, the same file the app does, so the two can't drift.

The app finds it through `EXPO_PUBLIC_COINGECKO_BASE_URL`, `EXPO_PUBLIC_KRAKEN_BASE_URL` and `EXPO_PUBLIC_KRAKEN_WS_URL`. On an Android emulator the host is `10.0.2.2`, not `localhost`.

`STUB_TICK_MS` controls the socket's tick rate. CI sets it to 5000: at the default rate the price walks away from any value a flow asserts before the assertion runs, which reads as a flaky test rather than what it is.

Flows tagged `stub` need it; the untagged ones run against the real Kraken. `npm run test:e2e:stub` and `npm run test:e2e` respectively.

**A green stub run proves nothing about the live API.** The web app learned this from a rate limit that only existed in production. Run against the real thing before believing it works.

## Coverage

`npm run test:coverage`. Thresholds are enforced in `jest.config.js` — with the two projects above, everything in the app is reachable by Jest, so unlike the web there's no exclusion list to maintain.

**CI must run `test:coverage`, not `test`.** Jest only checks `coverageThreshold` when `--coverage` is passed, so under a bare `npm test` the thresholds are inert and a coverage regression sails through a green build.

Maestro reports no coverage number. Its signal is pass/fail.

## Running them

```bash
npm test              # jest: unit + component, ~4s
npm run test:coverage # + coverage → coverage/lcov-report/index.html
npm run check:bundle  # bundle size budget
npm run lint          # eslint
npx tsc --noEmit      # typecheck

npm run stub          # the fake upstream, for the flows below
npm run test:e2e:stub # maestro against the stub
npm run test:e2e      # maestro against the real Kraken
```

`pre-commit` runs prettier + eslint on staged files. The Maestro flows run in CI on a pull request, not on push — they need an emulator.
