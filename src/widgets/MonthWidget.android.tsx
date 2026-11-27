import { Column, LinearProgressIndicator, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { MonthProps } from './useWidgetSync';

// Runs outside the app: it can only use its arguments and the imports above.
const Month = (props: MonthProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const dim = dark ? '#97A69D' : '#5F6B64';
  const line = (text: string, color: string, fontSize: number, bold = true) => (
    <Text color={color} maxLines={1} style={{ fontSize, fontWeight: bold ? 'bold' : 'normal' }}>{text}</Text>
  );
  return (
    <Column modifiers={[fillMaxSize(), background(dark ? '#12211A' : '#FFFFFF'), cornerRadius(20), paddingAll(14)]}>
      {line(props.title || 'Moneylah!', dim, 13, false)}
      {props.balance ? line(`In hand ${props.balance}`, dark ? '#F5F5F7' : '#111114', 18) : null}
      {line(props.expense ? `Spent ${props.expense}` : 'Open the app', dark ? '#FF6B6B' : '#D32F2F', props.balance ? 14 : 18)}
      {props.income ? line(`Income ${props.income}`, dark ? '#4ADE80' : '#1E7F3C', 14) : null}
      {props.budget >= 0 ? <Spacer modifiers={[height(6)]} /> : null}
      {props.budget >= 0 ? <LinearProgressIndicator progress={Math.min(props.budget, 1)} color={props.budget > 1 ? '#E03131' : dark ? '#8CC4A6' : '#0B3D2E'} trackColor={dark ? '#263A2F' : '#DDEFE0'} modifiers={[fillMaxWidth()]} /> : null}
      {props.budget >= 0 ? line(`${Math.round(props.budget * 100)}% of budget`, dim, 12, false) : null}
    </Column>
  );
};

export default createWidget<MonthProps>('MonthWidget', Month, { title: '', income: '', expense: '', budget: -1, balance: '' });
