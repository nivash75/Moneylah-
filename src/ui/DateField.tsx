import DateTimePicker from '@react-native-community/datetimepicker';

export type DateFieldProps = {
  value: Date;
  mode: 'date' | 'datetime';
  minimumDate?: Date;
  onChange: (date: Date) => void;
};

export function DateField({ value, mode, minimumDate, onChange }: DateFieldProps) {
  return <DateTimePicker value={value} mode={mode} minimumDate={minimumDate} display="compact" onValueChange={(_, d) => onChange(d)} />;
}
