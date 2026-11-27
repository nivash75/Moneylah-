import { Pressable, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { clock, formatTime, usePreferences } from '../data/preferences';
import type { DateFieldProps } from './DateField';
import { T } from './kit';

/** Android picks dates and times in dialogs, one at a time. */
export function DateField({ value, mode, minimumDate, onChange }: DateFieldProps) {
  usePreferences(); // Redraws the time when the clock setting changes.
  const chip = (part: 'date' | 'time', text: string) => (
    <Pressable
      onPress={() => DateTimePickerAndroid.open({ value, mode: part, is24Hour: clock() === '24', minimumDate: part === 'date' ? minimumDate : undefined, onValueChange: (_, d) => onChange(d) })}
      accessibilityRole="button"
      accessibilityLabel={`Change ${part}, ${text}`}
      style={{ backgroundColor: 'rgba(116,128,120,0.14)', borderRadius: 18, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' }}>
      <T>{text}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {chip('date', value.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}
      {mode === 'datetime' ? chip('time', formatTime(value.getTime())) : null}
    </View>
  );
}
