import { DarkTheme, Theme } from '@react-navigation/native';
import { Platform, ViewStyle } from 'react-native';

export const theme = {
  color: {
    bg: '#0B0E11', // app background (near-black)
    surface: '#151A21', // cards / rows
    surfaceAlt: '#1C232C', // pressed / elevated
    border: '#232B36',
    text: '#E6E8EA',
    muted: '#8A94A6',
    up: '#16C784', // gains (green)
    down: '#EA3943', // losses (red)
    accent: '#6366F1', // brand accent (indigo)
  },
  // translucent tints for pills/badges (up/down backgrounds)
  tint: {
    up: 'rgba(22,199,132,0.14)',
    down: 'rgba(234,57,67,0.14)',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, // 4-based scale
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  font: { h1: 28, h2: 20, body: 16, small: 14, caption: 12 },
  // Responsive breakpoints (min-width px). Below `sm` is xs.
  breakpoint: { sm: 376, md: 768 },
} as const;

// Single source for the up/down palette: `fg` for text/icons, `tint` for the
// translucent pill background. Keeps every gain/loss element on the same colors.
export const changeColors = (isUp: boolean) => ({
  fg: isUp ? theme.color.up : theme.color.down,
  tint: isUp ? theme.tint.up : theme.tint.down,
});

export const navigatorScreenOptions = {
  headerStyle: { backgroundColor: theme.color.bg },
  headerTitleStyle: { color: theme.color.text },
  headerTintColor: theme.color.accent,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.color.bg },
};

export const customDarkTheme // Map our design tokens onto React Navigation's theme so headers/backgrounds match.
: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.color.bg,
    card: theme.color.surface,
    text: theme.color.text,
    border: theme.color.border,
    primary: theme.color.accent,
  },
};

// Smooth transition is a react-native-web-only style; apply it on web only so
// native never receives an unknown style prop.
export const webTransition =
  Platform.OS === 'web'
    ? ({
        transitionDuration: '150ms',
        transitionProperty: 'background-color, border-color, transform',
      } as unknown as ViewStyle)
    : undefined;
