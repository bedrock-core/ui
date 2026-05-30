import { Button, Card, Divider, theme } from '@bedrock-core/ore-styled';
import { Panel, Text, useState, type JSX } from '@bedrock-core/ui';
import {
  Counter,
  EventCounter,
  ExitPanel,
  InfoPanel,
  RefTimer,
  ResourcesPanel,
  SettingsController,
  SettingsDisplay,
  ThemeController,
  ThemeDisplay,
  TodoList,
} from '../components';
import { SettingsContext, ThemeContext, type Settings, type Theme } from '../contexts';

const { spacing } = theme.tokens;

function Row({ children }: { children: JSX.Element[] }): JSX.Element {
  return (
    <Panel flexDirection={'row'} gap={spacing.sm}>
      {children}
    </Panel>
  );
}

function Col({ children }: { children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm} flexGrow={1}>
      {children}
    </Panel>
  );
}

export function HooksDemo(): JSX.Element {
  const [themeValue, setTheme] = useState<Theme>('light');
  const [settings, setSettings] = useState<Settings>({
    volume: 50,
    showNotifications: true,
  });
  const [refreshVersion, setRefreshVersion] = useState(0);

  return (
    <ThemeContext value={themeValue}>
      <SettingsContext value={settings}>
        <Card flexDirection={'column'} padding={8} gap={8}>

          {/* header */}
          <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Text>{`§f@bedrock-core/ui hooks demo §7#${refreshVersion}`}</Text>
            <Button onPress={(): void => setRefreshVersion(v => v + 1)}>{'§aRefresh'}</Button>
          </Panel>

          <Divider variant={'light'} />

          {/* context pairs: display + controller side by side */}
          <Row>
            <Col>
              <ThemeDisplay />
              <ThemeController onThemeChange={setTheme} />
            </Col>
            <Col>
              <SettingsDisplay />
              <SettingsController onSettingsChange={setSettings} />
            </Col>
          </Row>

          <Divider variant={'light'} />

          {/* hooks: state/ref left, reducer/event right */}
          <Row>
            <Col>
              <Counter />
              <RefTimer />
            </Col>
            <Col>
              <TodoList />
              <EventCounter />
            </Col>
          </Row>

          <Divider variant={'light'} />

          {/* info / utility */}
          <Row>
            <Col>
              <InfoPanel />
            </Col>
            <Col>
              <ResourcesPanel />
              <ExitPanel />
            </Col>
          </Row>

        </Card>
      </SettingsContext>
    </ThemeContext>
  );
}
