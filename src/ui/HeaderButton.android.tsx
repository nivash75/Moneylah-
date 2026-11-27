import { Pressable } from 'react-native';
import { Stack } from 'expo-router';
import type { HeaderButtonProps } from './HeaderButton';
import { Icon } from './kit';

const NAMES = { xmark: 'close', checkmark: 'checkmark', plus: 'add', pencil: 'pencil' } as const;

/** Android's system toolbar buttons need image files, so these are drawn with the app's icons. */
export function HeaderButton({ placement, icon, label, onPress, hidden }: HeaderButtonProps) {
  const button = () => hidden ? null : (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} android_ripple={{ borderless: true, radius: 22 }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={NAMES[icon]} size={26} />
    </Pressable>
  );
  // A close button replaces the back arrow.
  return <Stack.Screen options={placement === 'left' ? { headerLeft: button, headerBackVisible: false } : { headerRight: button }} />;
}
