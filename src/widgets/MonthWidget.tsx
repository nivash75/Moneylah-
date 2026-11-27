import { ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, minimumScaleFactor, privacySensitive, tint } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type MonthProps = {
  title: string;
  income: string;
  expense: string;
  /** Share of the overall budget used, or -1 without a budget. */
  budget: number;
  /** Cash, bank and savings today. */
  balance: string;
};

// Runs inside the widget extension: it can only use its arguments and the imports above.
const Month = (props: MonthProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const line = (text: string, color: string, size: number) => (
    <Text modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(color), lineLimit(1), minimumScaleFactor(0.5), privacySensitive()]}>{text}</Text>
  );
  return (
    <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }), containerBackground(dark ? '#12211A' : '#FFFFFF', 'widget')]}>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(dark ? '#97A69D' : '#5F6B64'), lineLimit(1)]}>{props.title || 'Moneylah!'}</Text>
      {props.balance ? line(`In hand ${props.balance}`, dark ? '#F5F5F7' : '#111114', 18) : null}
      {line(props.expense ? `Spent ${props.expense}` : 'Open the app', dark ? '#FF6B6B' : '#D32F2F', props.balance ? 14 : 20)}
      {props.income ? line(`Income ${props.income}`, dark ? '#4ADE80' : '#1E7F3C', 14) : null}
      {props.budget >= 0 ? <ProgressView value={Math.min(props.budget, 1)} modifiers={[tint(props.budget > 1 ? '#E03131' : dark ? '#8CC4A6' : '#0B3D2E')]} /> : null}
      {props.budget >= 0 ? line(`${Math.round(props.budget * 100)}% of budget`, dark ? '#97A69D' : '#5F6B64', 12) : null}
    </VStack>
  );
};

export default createWidget<MonthProps>('MonthWidget', Month);
