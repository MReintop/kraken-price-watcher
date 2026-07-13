import type { ReactNode } from 'react';

// react-native-svg has no jsdom rendering. Stub its primitives as plain host
// elements so charts render and can be queried: leaf marks carry a testid for
// counting, and <Text> passes children through so axis labels are findable.
type WithChildren = { children?: ReactNode };

export const Svg = ({ children }: WithChildren) => (
  <div data-testid="svg">{children}</div>
);
export const G = ({ children }: WithChildren) => <>{children}</>;
export const Line = () => <div data-testid="svg-line" />;
export const Rect = () => <div data-testid="svg-rect" />;
export const Text = ({ children }: WithChildren) => (
  <div data-testid="svg-text">{children}</div>
);

export default Svg;
