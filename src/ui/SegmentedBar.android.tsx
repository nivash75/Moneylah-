import { Pressable, Text, useColorScheme, View } from 'react-native';
import type { SegmentedBarProps } from './SegmentedBar';

/** The iPhone's capsule-shaped segmented control. */
export function SegmentedBar({ values, selectedIndex, onSelect }: SegmentedBarProps) {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={{ flexDirection: 'row', height: 38, borderRadius: 19, padding: 2, backgroundColor: 'rgba(116,128,120,0.16)' }}>
      {values.map((label, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable key={label} onPress={() => onSelect(index)} accessibilityRole="button" accessibilityState={{ selected }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: selected ? (dark ? '#4A5A51' : '#FFFFFF') : 'transparent', elevation: selected ? 2 : 0 }}>
            <Text numberOfLines={1} style={{ color: dark ? '#F5F5F7' : '#111114', fontSize: 14, fontWeight: selected ? '600' : '500' }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
