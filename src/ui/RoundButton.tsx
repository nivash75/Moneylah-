import { Pressable } from 'react-native';
import { Icon, useTheme } from './kit';

/** A floating circular button like the ones in an iPhone navigation bar. Used on Android. */
export function RoundButton({ icon, label, onPress, prominent }: { icon: string; label: string; onPress: () => void; prominent?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: prominent ? theme.accent : theme.card, borderWidth: prominent ? 0 : 1, borderColor: theme.line, elevation: 2, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={26} color={prominent ? theme.onAccent : theme.text} />
    </Pressable>
  );
}
