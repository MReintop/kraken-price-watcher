import { theme, changeColors } from './theme';

// Named .tsx despite rendering nothing: the extension picks the Jest project,
// and only `components` maps react-native/@react-navigation to stubs — which
// theme.ts imports, so the node project cannot even parse it.
//
// There is no axe for React Native, so the contrast rule is asserted directly.
// Thresholds are WCAG's: 4.5:1 for body text, 3:1 for non-text UI (spinners,
// icons). The maths is the same on any platform even though WCAG itself is a web
// standard — a screen reader user's eyes do not know which renderer drew this.
const RATIO_TEXT = 4.5;
const RATIO_NON_TEXT = 3;

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (foreground: string, background: string) => {
  const [a, b] = [luminance(foreground), luminance(background)];
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

// `rgba(r,g,b,a)` over an opaque colour — the tints are translucent, so what the
// eye compares against is the blend, not the token.
const flatten = (rgba: string, backdrop: string) => {
  const [r, g, b, alpha] = rgba.match(/[\d.]+/g)!.map(Number);
  const base = backdrop.replace('#', '');
  const mix = [r, g, b].map((value, i) => {
    const under = parseInt(base.slice(i * 2, i * 2 + 2), 16);
    return Math.round(alpha * value + (1 - alpha) * under);
  });
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

describe('theme contrast', () => {
  it('reads muted text on a card', () => {
    // Arrange / Act
    const ratio = contrast(theme.color.muted, theme.color.surface);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('reads muted text on the app background', () => {
    // Arrange / Act
    const ratio = contrast(theme.color.muted, theme.color.bg);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('reads body text on a card', () => {
    // Arrange / Act
    const ratio = contrast(theme.color.text, theme.color.surface);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('reads a gain inside its own pill', () => {
    // Arrange
    const { fg, tint } = changeColors(true);

    // Act
    const ratio = contrast(fg, flatten(tint, theme.color.surface));

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('reads a loss inside its own pill', () => {
    // Arrange — the pill tints the same hue it prints, so it darkens itself
    const { fg, tint } = changeColors(false);

    // Act
    const ratio = contrast(fg, flatten(tint, theme.color.surface));

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('reads an error message on the app background', () => {
    // Arrange / Act
    const ratio = contrast(theme.color.down, theme.color.bg);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('reads the label on a selected chip', () => {
    // Arrange / Act — `accent` is a filled background here
    const ratio = contrast(theme.color.text, theme.color.accent);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('reads accent-coloured text on the app background', () => {
    // Arrange / Act — the separate token exists for exactly this
    const ratio = contrast(theme.color.accentText, theme.color.bg);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_TEXT);
  });

  it('shows the spinner against the app background', () => {
    // Arrange / Act — non-text, so the lower bar applies
    const ratio = contrast(theme.color.accent, theme.color.bg);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_NON_TEXT);
  });

  it('distinguishes the live dot from the app background', () => {
    // Arrange / Act
    const ratio = contrast(theme.color.up, theme.color.bg);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(RATIO_NON_TEXT);
  });
});
