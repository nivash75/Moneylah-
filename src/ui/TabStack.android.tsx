import { Stack } from 'expo-router';
import { glassHeader } from './headers';
import { LargeTitle } from './LargeTitle';

/** Each tab has its own navigation bar, with a large title like the iPhone's. */
export function TabStack({ title }: { title: string }) {
  return (
    <LargeTitle.Provider value={title}>
      <Stack screenOptions={{ ...glassHeader, headerLargeTitleEnabled: true }}>
        <Stack.Screen name="index" options={{ title }} />
      </Stack>
    </LargeTitle.Provider>
  );
}
