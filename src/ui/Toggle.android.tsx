import { useEffect, useState } from 'react';
import { Animated, Pressable, useColorScheme } from 'react-native';
import type { ToggleProps } from './Toggle';

/** The iPhone's switch: a green capsule with a sliding white knob. */
export function Toggle({ value = false, onValueChange, accessibilityLabel }: ToggleProps) {
  const dark = useColorScheme() === 'dark';
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [value, position]);

  return (
    <Pressable onPress={() => void onValueChange?.(!value)} hitSlop={10} accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value }} style={{ width: 52, height: 32, borderRadius: 16, padding: 2, backgroundColor: value ? (dark ? '#30D158' : '#34C759') : dark ? '#39463F' : '#DCE0DD' }}>
      <Animated.View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', elevation: 3, transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
    </Pressable>
  );
}
