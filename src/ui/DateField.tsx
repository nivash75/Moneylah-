import DateTimePicker from '@react-native-community/datetimepicker';
import { pickerLocale } from '../data/preferences';

export type DateFieldProps = {
  value: Date;
  mode: 'date' | 'datetime';
  minimumDate?: Date;
  onChange: (date: Date) => void;
};

export function DateField({ value, mode, minimumDate, onChange }: DateFieldProps) {
  return <DateTimePicker value={value} mode={mode} minimumDate={minimumDate} display="compact" locale={mode === 'datetime' ? pickerLocale() : undefined} onValueChange={(_, d) => onChange(d)} />;
}
