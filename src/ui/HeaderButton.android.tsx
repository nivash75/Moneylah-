import { Stack } from 'expo-router';
import type { HeaderButtonProps } from './HeaderButton';
import { RoundButton } from './RoundButton';

const NAMES = { xmark: 'close', checkmark: 'checkmark', plus: 'add', pencil: 'pencil' } as const;

/** Android's system toolbar buttons look nothing like the iPhone's, so these are drawn by the app. */
export function HeaderButton({ placement, icon, label, onPress, hidden }: HeaderButtonProps) {
  const button = () => hidden ? null : <RoundButton icon={NAMES[icon]} label={label} onPress={onPress} prominent={icon === 'checkmark'} />;
  return <Stack.Screen options={placement === 'left' ? { headerLeft: button } : { headerRight: button }} />;
}
