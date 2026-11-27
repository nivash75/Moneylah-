import { Stack } from 'expo-router';

export type HeaderButtonProps = {
  placement: 'left' | 'right';
  icon: 'xmark' | 'checkmark' | 'plus' | 'pencil';
  label: string;
  onPress: () => void;
  hidden?: boolean;
};

/** A system button in the navigation bar. */
export function HeaderButton({ placement, icon, label, onPress, hidden }: HeaderButtonProps) {
  return (
    <Stack.Toolbar placement={placement}>
      <Stack.Toolbar.Button icon={icon} variant={icon === 'checkmark' ? 'prominent' : 'plain'} accessibilityLabel={label} hidden={hidden} onPress={onPress} />
    </Stack.Toolbar>
  );
}
