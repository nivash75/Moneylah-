import type { ComponentType } from 'react';
import NativeSegmentedControl, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';

// The library's class typing predates React Native's current types.
const SegmentedControl = NativeSegmentedControl as unknown as ComponentType<SegmentedControlProps>;

export type SegmentedBarProps = { values: string[]; selectedIndex: number; onSelect: (index: number) => void };

export function SegmentedBar({ values, selectedIndex, onSelect }: SegmentedBarProps) {
  return <SegmentedControl values={values} selectedIndex={selectedIndex} onChange={(e) => onSelect(e.nativeEvent.selectedSegmentIndex)} style={{ height: 36 }} />;
}
