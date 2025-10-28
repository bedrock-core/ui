import { createContext } from '@bedrock-core/ui';

/**
 * Settings context for sharing settings state across components
 */
export interface Settings {
  volume: number;
  showNotifications: boolean;
}

export const SettingsContext = createContext<Settings>({
  volume: 50,
  showNotifications: true,
});
