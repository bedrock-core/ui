import { JSX, Panel, useState } from '@bedrock-core/ui';
import {
  Counter,
  EventCounter,
  ExitPanel,
  InfoPanel,
  MetadataDisplay,
  ResourcesPanel,
  SettingsController,
  SettingsDisplay,
  ThemeController,
  ThemeDisplay,
  TodoList,
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
    <ThemeContext value={theme}>
      <SettingsContext value={settings}>
        {/* Main flex container - column layout */}
        <Panel
          display={'flex'}
          flexDirection={'column'}
          padding={'10%'}
          gap={'10%'}
          width={'100%'}
          height={'100%'}
        >
          {/* Row 1: Context and State Demonstrations */}
          <Panel display={'flex'} flexDirection={'row'} gap={'10%'} flexGrow={1}>
            <ThemeDisplay />
            <SettingsDisplay />
            <TodoList />
            <MetadataDisplay />
          </Panel>

          {/* Row 2: Effects and Controllers */}
          <Panel display={'flex'} flexDirection={'row'} gap={'10%'} flexGrow={1}>
            <ThemeController onThemeChange={setTheme} />
            <SettingsController onSettingsChange={setSettings} />
            <Counter />
          </Panel>

          {/* Row 3: Information and Exit */}
          <Panel display={'flex'} flexDirection={'row'} gap={'10%'} flexGrow={1}>
            <InfoPanel />
            <ResourcesPanel />
            <EventCounter />
            <ExitPanel />
          </Panel>
        </Panel>
      </SettingsContext>
    </ThemeContext>
  );
}
