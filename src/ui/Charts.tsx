import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { T, useTheme } from './kit';

export const PALETTE = ['#0D8575', '#E8890C', '#4C6EF5', '#D6336C', '#7048E8', '#5C940D', '#1098AD', '#E03131', '#868E96'];

export function Donut({ values, label }: { values: number[]; label: string }) {
  const total = values.reduce((a, b) => a + b, 0);
  const radius = 70;
  const length = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        <G rotation={-90} origin="90, 90">
          {values.map((value, i) => {
            const part = (value / total) * length;
            const start = offset;
            offset += part;
            return <Circle key={i} cx={90} cy={90} r={radius} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={30} strokeDasharray={`${Math.max(part - 1.5, 0.5)} ${length}`} strokeDashoffset={-start} />;
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', width: 100 }}><T bold size={14} center>{label}</T></View>
    </View>
  );
}

export function Trend({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const theme = useTheme();
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const bar = (value: number, color: string) => <View style={{ width: 12, height: Math.max((value / max) * 110, value ? 2 : 0), backgroundColor: color, borderRadius: 3 }} />;
  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', height: 130, alignItems: 'flex-end' }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>{bar(d.income, theme.income)}{bar(d.expense, theme.expense)}</View>
            <T dim size={11}>{d.label}</T>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <T size={12} color={theme.income}>■ Income</T>
        <T size={12} color={theme.expense}>■ Expense</T>
      </View>
    </View>
  );
}
