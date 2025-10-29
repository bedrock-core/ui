import { createContext } from '@bedrock-core/ui';

/**
 * Theme context for sharing theme state across components
 */
export type Theme = 'light' | 'dark' | 'neon';
export const ThemeContext = createContext<Theme>('light');
