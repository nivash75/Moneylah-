import { useEffect, useRef, useState, type ComponentProps, type ComponentRef, type ComponentType, type ReactNode } from 'react';
import { Alert, Dimensions, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NativeSegmentedControl, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import { getLocales } from 'expo-localization';

// The library's class typing predates React Native's current types.
const SegmentedControl = NativeSegmentedControl as unknown as ComponentType<SegmentedControlProps>;

const light = { bg: '#EFF6F0', card: '#FFFFFF', text: '#111114', dim: '#5F6B64', line: '#DDEFE0', accent: '#0B3D2E', onAccent: '#FFFFFF', income: '#1E7F3C', expense: '#D32F2F', danger: '#C92A2A', warn: '#B35C00' };
const dark: typeof light = { bg: '#06110C', card: '#12211A', text: '#F5F5F7', dim: '#97A69D', line: '#263A2F', accent: '#8CC4A6', onAccent: '#062219', income: '#4ADE80', expense: '#FF6B6B', danger: '#FF6B6B', warn: '#FFB454' };

export const useTheme = () => (useColorScheme() === 'dark' ? dark : light);
export const decimalSeparator = () => getLocales()[0]?.decimalSeparator ?? '.';
export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const theme = useTheme();
  const safe = name in Ionicons.glyphMap ? (name as IconName) : 'pricetag';
  return <Ionicons name={safe} size={size} color={color ?? theme.accent} />;
}

export function T({ children, dim, bold, size = 16, color, center }: { children: ReactNode; dim?: boolean; bold?: boolean; size?: number; color?: string; center?: boolean }) {
  const theme = useTheme();
  return (
    <Text style={{ color: color ?? (dim ? theme.dim : theme.text), fontSize: size, fontWeight: bold ? '600' : '400', textAlign: center ? 'center' : undefined, fontVariant: ['tabular-nums'] }}>
      {children}
    </Text>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const [keyboard, setKeyboard] = useState(0);
  // Not automaticallyAdjustKeyboardInsets: on sheets it scrolls the top of the form under the header.
  useEffect(() => {
    const subs = [
      // Android reports only after the keyboard has moved.
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height)),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(0)),
      // Scroll only if the keyboard hides the field being typed in.
      Keyboard.addListener('keyboardDidShow', (e) => {
        const field = TextInput.State.currentlyFocusedInput();
        scroll.current?.getNativeScrollRef()?.measureInWindow((_sx, top, _sw, viewHeight) => {
          // Sheets measure from their own top, while the keyboard reports screen coordinates.
          const sheetTop = Math.max(0, Dimensions.get('screen').height - top - viewHeight);
          field?.measureInWindow((_x, y, _width, height) => {
            const hidden = sheetTop + y + height + 12 - e.endCoordinates.screenY;
            if (hidden > 0) scroll.current?.scrollTo({ y: offset.current + hidden });
          });
        });
      }),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return (
    <ScrollView
      ref={scroll}
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.screen, keyboard > 0 && { paddingBottom: keyboard + 16 }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEventThrottle={32}
      onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }}>
      {children}
    </ScrollView>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {title ? <Text style={[styles.heading, { color: theme.dim }]}>{title.toUpperCase()}</Text> : null}
      <View style={[styles.card, { backgroundColor: theme.card }]}>{children}</View>
    </View>
  );
}

export function Row({ icon, title, subtitle, value, valueColor, onPress, children }: { icon?: string; title: string; subtitle?: string; value?: string; valueColor?: string; onPress?: () => void; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [styles.row, pressed && { opacity: 0.5 }]}>
      {icon ? <Icon name={icon} /> : null}
      <View style={{ flex: 1 }}>
        <T>{title}</T>
        {subtitle ? <T dim size={13}>{subtitle}</T> : null}
      </View>
      {value !== undefined ? <T color={valueColor}>{value}</T> : null}
      {children}
      {onPress ? <Icon name="chevron-forward" size={16} color={theme.dim} /> : null}
    </Pressable>
  );
}

export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <SegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={options.findIndex((o) => o.value === value)}
      onChange={(e) => onChange(options[e.nativeEvent.selectedSegmentIndex].value)}
      style={{ height: 36 }}
    />
  );
}

export function Chips<V extends string | null>({ options, value, onChange, disabled }: { options: { value: V; label: string; icon?: string }[]; value: V; onChange: (v: V) => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} disabled={disabled} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityLabel={o.label || o.icon} accessibilityState={{ selected: on, disabled }} style={[styles.chip, { borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent : 'transparent', opacity: disabled && !on ? 0.4 : 1 }]}>
            {o.icon ? <Icon name={o.icon} size={16} color={on ? theme.onAccent : theme.accent} /> : null}
            {o.label ? <T size={14} color={on ? theme.onAccent : undefined}>{o.label}</T> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <T>{label}</T>
      <TextInput accessibilityLabel={label} placeholderTextColor={theme.dim} underlineColorAndroid="transparent" {...input} style={[styles.input, { color: theme.text }]} />
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary' }: { title: string; onPress: () => void; kind?: 'primary' | 'danger' | 'plain' }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.button, { backgroundColor: kind === 'primary' ? theme.accent : theme.card, opacity: pressed ? 0.7 : 1 }]}>
      <T bold color={kind === 'primary' ? theme.onAccent : kind === 'danger' ? theme.danger : theme.accent}>{title}</T>
    </Pressable>
  );
}

export function Stepper({ title, onStep }: { title: string; onStep: (direction: -1 | 1) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onStep(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous"><Icon name="chevron-back" size={24} /></Pressable>
      <T bold size={18}>{title}</T>
      <Pressable onPress={() => onStep(1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next"><Icon name="chevron-forward" size={24} /></Pressable>
    </View>
  );
}

export function Bar({ fraction, color }: { fraction: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(Math.max(fraction, 0), 1) * 100}%`, height: 8, backgroundColor: color }} />
    </View>
  );
}

export function Note({ children, warn }: { children: ReactNode; warn?: boolean }) {
  const theme = useTheme();
  return <View style={{ paddingHorizontal: 4 }}><T size={13} color={warn ? theme.warn : theme.dim}>{children}</T></View>;
}

export function confirm(title: string, message: string, action: string, run: () => void) {
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: action, style: 'destructive', onPress: run }]);
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 16, paddingBottom: 32, width: '100%', maxWidth: 700, alignSelf: 'center' },
  heading: { fontSize: 12, fontWeight: '600', paddingHorizontal: 4 },
  card: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, minHeight: 36 },
  input: { flex: 1, textAlign: 'right', fontSize: 17, minHeight: 40 },
  button: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
});
