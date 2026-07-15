// jsdom implements no matchMedia, and react-native-web reads
// `prefers-reduced-motion` through it — resolving TRUE when it is missing. Left
// alone, every animated component quietly tests its reduced-motion path instead
// of the one it claims to, and does so a microtask into the test rather than at
// render. Default to motion allowed; tests wanting the other path stub the hook.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
