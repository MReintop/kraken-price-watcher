// Stub for @react-navigation/native so component tests don't transform the
// whole (ESM) navigation dep tree. theme.ts only needs DarkTheme (spread into
// its custom theme); Theme is a type and is erased.
export const DarkTheme = {
  dark: true,
  colors: {
    primary: '',
    background: '',
    card: '',
    text: '',
    border: '',
    notification: '',
  },
  fonts: {},
};

export default { DarkTheme };
