import { JSX, useState } from '@bedrock-core/ui';
import {
  Counter,
  EventCounter,
  ExitPanel,
  GridLayoutPanel,
  InfoPanel,
  MetadataDisplay,
  ResourcesPanel,
  SettingsController,
  SettingsDisplay,
  ThemeController,
  ThemeDisplay,
  TodoList
} from './components';
import { SettingsContext, ThemeContext, type Settings, type Theme } from './contexts';

export function Example(): JSX.Element {
  // Theme state (shared via context)
  const [theme, setTheme] = useState<Theme>('light');

  // Settings state (shared via context)
  const [settings, setSettings] = useState<Settings>({
    volume: 50,
    showNotifications: true,
  });

  return (
    <ThemeContext.Provider value={theme}>
      <SettingsContext.Provider value={settings}>
        {/* Row 1: Context and State Demonstrations */}
        <ThemeDisplay />
        <SettingsDisplay />
        <TodoList />
        <MetadataDisplay />

        {/* Row 2: Effects and Controllers */}
        <ThemeController onThemeChange={setTheme} />
        <SettingsController onSettingsChange={setSettings} />
        <EventCounter />
        <Counter />

        {/* Row 3: Information and Exit */}
        <InfoPanel />
        <ResourcesPanel />
        <GridLayoutPanel />
        <ExitPanel />
      </SettingsContext.Provider>
    </ThemeContext.Provider>
  );
}

