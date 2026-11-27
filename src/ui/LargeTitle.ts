import { createContext } from 'react';

/** The title a screen draws above its content. Only Android sets it; iOS has a native large title. */
export const LargeTitle = createContext<string | null>(null);
