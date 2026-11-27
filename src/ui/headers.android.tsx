import { Text, View } from 'react-native';
import type { NativeStackHeaderProps } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './kit';
import { RoundButton } from './RoundButton';

/** The iPhone navigation bar, drawn for Android: round buttons around a centred title. */
function Header({ options, route, back, navigation }: NativeStackHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = options.presentation === 'transparentModal';
  // Screens with a large title draw it above their content, so it scrolls away.
  const title = options.headerLargeTitleEnabled ? '' : (options.title ?? route.name);
  const left = options.headerLeft?.({ canGoBack: !!back });
  const bar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: sheet ? 76 : 60, paddingHorizontal: 16 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 72, right: 72, alignItems: 'center' }}>
        <Text numberOfLines={1} accessibilityRole="header" style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
      </View>
      <View>{left ?? (back ? <RoundButton icon="chevron-back" label="Back" onPress={navigation.goBack} /> : null)}</View>
      <View>{options.headerRight?.({ canGoBack: !!back })}</View>
    </View>
  );
  if (!sheet) return <View style={{ backgroundColor: theme.bg, paddingTop: insets.top }}>{bar}</View>;
  // The screen underneath stays visible, dimmed, above the sheet's rounded corners.
  return (
    <View style={{ backgroundColor: 'rgba(0,0,0,0.22)', paddingTop: insets.top + 10 }}>
      <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>{bar}</View>
    </View>
  );
}

export const glassHeader = { header: (props: NativeStackHeaderProps) => <Header {...props} /> };

export const modalOptions = { presentation: 'transparentModal', animation: 'slide_from_bottom' } as const;
