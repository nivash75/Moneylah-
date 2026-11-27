import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';

/** Draws above every screen. The back button can't dismiss it. */
export function Overlay({ children }: { children: ReactNode }) {
  return (
    <Modal visible statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1 }}>{children}</View>
    </Modal>
  );
}
