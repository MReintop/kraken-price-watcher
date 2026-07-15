import { Text } from 'react-native';

// Icon fonts don't load in jsdom; render a lightweight stand-in so components
// that use icons still render and can be queried by glyph name.
const Icon = (props: { name?: string }) => <Text>{props.name ?? ''}</Text>;

// One mapper entry covers both import shapes, so both must resolve to the
// component: the per-family path (`.../Ionicons`) takes the default, while the
// barrel takes the named export.
export const Ionicons = Icon;
export default Icon;
