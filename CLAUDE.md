@AGENTS.md

# Adding a component test? Name it `.tsx`.

`jest.config.js` routes tests by extension: `*.test.ts` → the **logic** project (node), `*.test.tsx` → the **components** project (jsdom + react-native-web). A component test named `.ts` lands in node and dies on its first import with an error that says nothing about the cause.

The extension follows **what the test renders**, not what it's about — `theme.contrast.test.tsx` tests a plain object and still needs the `.tsx`.

Full reasoning, and the rest of the testing contract, in [docs/testing.md](docs/testing.md).

```bash
npm test              # jest: unit + component, ~4s
npm run test:coverage # + coverage report
npm run check:bundle  # bundle size budget
npm run lint          # eslint
npx tsc --noEmit      # typecheck

npm run stub          # fake upstream for the flows
npm run test:e2e:stub # maestro against the stub
npm run test:e2e      # maestro against the real Kraken
```
