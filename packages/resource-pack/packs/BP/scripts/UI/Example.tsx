import { JSX, Suspense, useState } from '@bedrock-core/ui';
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
import { Fallback } from './Fallback';

export function Example(): JSX.Element {
  // Theme state (shared via context)
  const [theme, setTheme] = useState<Theme>('light');

  // Settings state (shared via context)
  const [settings, setSettings] = useState<Settings>({
    volume: 50,
    showNotifications: true,
  });

  return (
    <ThemeContext value={theme}>
      <SettingsContext value={settings}>
        {/* Row 1: Context and State Demonstrations */}
        <ThemeDisplay />
        <SettingsDisplay />
        <TodoList />
        <MetadataDisplay />

        {/* Row 2: Effects and Controllers */}
        <ThemeController onThemeChange={setTheme} />
        <SettingsController onSettingsChange={setSettings} />
        <Suspense fallback={<Fallback width={192} height={140} x={414} y={160} />} awaitTimeout={100}>
          <EventCounter />
        </Suspense>
        <Counter />

        {/* Row 3: Information and Exit */}
        <InfoPanel />
        <ResourcesPanel />
        <GridLayoutPanel />
        <ExitPanel />
      </SettingsContext>
    </ThemeContext>
  );
}

