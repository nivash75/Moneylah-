import { Pressable, Text, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, useTheme } from './kit';
import { TABS } from './tabList';

/** A floating capsule like the iPhone's tab bar. */
function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: theme.bg, paddingHorizontal: 14, paddingTop: 6, paddingBottom: insets.bottom + 6 }}>
      <View style={{ flexDirection: 'row', width: '100%', maxWidth: 500, alignSelf: 'center', backgroundColor: theme.card, borderRadius: 36, borderWidth: 1, borderColor: theme.line, padding: 4, elevation: 6 }}>
        {state.routes.map((route, index) => {
          const tab = TABS.find(([name]) => name === route.name);
          if (!tab) return null;
          const [, title, , glyph] = tab;
          const selected = state.index === index;
          const color = selected ? theme.accent : theme.text;
          const press = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable key={route.key} onPress={press} accessibilityRole="tab" accessibilityLabel={title} accessibilityState={{ selected }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56, borderRadius: 30, backgroundColor: selected ? 'rgba(116,128,120,0.16)' : 'transparent' }}>
              <Icon name={glyph} size={24} color={color} />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ color, fontSize: 10.5, fontWeight: '600' }}>{title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AppTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      {TABS.map(([name, title]) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    </Tabs>
  );
}
