import { Switch, type SwitchProps } from 'react-native';

export type ToggleProps = Pick<SwitchProps, 'value' | 'onValueChange' | 'accessibilityLabel'>;

export function Toggle(props: ToggleProps) {
  return <Switch {...props} />;
}
