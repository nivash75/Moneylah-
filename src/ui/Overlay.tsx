import type { ReactNode } from 'react';
import { FullWindowOverlay } from 'react-native-screens';

/** Draws above every screen, including sheets. */
export function Overlay({ children }: { children: ReactNode }) {
  return <FullWindowOverlay>{children}</FullWindowOverlay>;
}
