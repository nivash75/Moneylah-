import { Stack } from 'expo-router';
import { glassHeader } from './headers';

/** Each tab has its own navigation bar. */
export function TabStack({ title }: { title: string }) {
  return (
    <Stack screenOptions={{ ...glassHeader, headerLargeTitleEnabled: true, headerLargeStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
