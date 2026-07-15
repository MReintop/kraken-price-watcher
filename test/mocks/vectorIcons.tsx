import { Text } from 'react-native';

// Icon fonts don't load in jsdom; render a lightweight stand-in so components
// that use icons still render and can be queried.
export const Ionicons = (props: { name?: string }) => (
  <Text>{props.name ?? ''}</Text>
);

export default { Ionicons };
