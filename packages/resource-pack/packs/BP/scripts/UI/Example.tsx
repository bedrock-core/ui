import { JSX, useState, Button, Panel, Text } from '@bedrock-core/ui';

// Import all grid components
import {
  ThemeDisplay,
  SettingsDisplay,
  TodoList,
  RefTimer,
  EventCounter,
  Counter,
  ThemeController,
  SettingsController,
  InfoPanel,
  ResourcesPanel,
  GridLayoutPanel,
  ExitPanel,
  InventoryPanel,
} from './components';

// Import contexts
import { ThemeContext, SettingsContext, type Theme, type Settings } from './contexts';

/**
 * ============================================================================
 * COMPREHENSIVE HOOKS DEMONSTRATION
 * ============================================================================
 *
 * This file demonstrates the hooks currently available in @bedrock-core/ui:
 *
 * 1. useState - Simple state management
 *    - See: Counter component (count, isAutoIncrement)
 *    - See: Example component (theme, settings)
 *
 * 2. useEffect - Side effects and lifecycle
 *    - See: Counter component (auto-increment interval, count logging)
 *    - See: RefTimer component (cleanup on unmount)
 *    - See: EventCounter component (script event subscription)
 *
 * 3. useRef - Mutable values without re-renders
 *    - See: RefTimer component (intervalRef, previousCountRef)
 *    - Use for: timers, previous values, DOM-like references
 *
 * 4. useContext - Global state via context
 *    - See: ThemeContext (shared theme state)
 *    - See: SettingsContext (shared settings)
 *    - Consumers: ThemeDisplay, SettingsDisplay
 *
 * 5. useReducer - Complex state logic with actions
 *    - See: TodoList component (todo management with actions)
 *    - Use for: complex state transitions, multiple actions
 *
 * 6. createContext - Create context objects
 *    - See: ThemeContext, SettingsContext
 *    - Provider usage: <ThemeContext value={...}> and <SettingsContext value={...}>
 *
 * KEY CONCEPTS DEMONSTRATED:
 * - Context propagation through component tree
 * - Provider pattern for sharing state
 * - Stable dispatch functions (useReducer)
 * - Ref mutations don't trigger re-renders
 * - Effect cleanup functions
 * - Dependency arrays in useEffect
 * - Component composition and separation of concerns
 * ============================================================================
 */

/**
 * Example UI - 3x4 Grid Layout with Comprehensive Hooks Demonstration
 *
 * This is the main composition component that orchestrates all grid cells.
 * Each cell is a separate component demonstrating different UI framework features.
 *
 * Grid Layout:
 * - 3 rows × 4 columns
 * - 192×140 cells with 10px gaps
 * - Total dimensions: 818×460
 *
 * State Management:
 * - Theme state (shared via ThemeContext)
 * - Settings state (shared via SettingsContext)
 */
export function Example(): JSX.Element {
  // Theme state (shared via context)
  const [theme, setTheme] = useState<Theme>('light');

  // Settings state (shared via context)
  const [settings, setSettings] = useState<Settings>({
    volume: 50,
    showNotifications: true,
  });

  // Local refresh marker (forces a re-render of this composition root)
  const [refreshVersion, setRefreshVersion] = useState(0);

  return (
    <ThemeContext value={theme}>
      <SettingsContext value={settings}>
        <Panel flexDirection={'column'} padding={8} gap={8}>
          <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Text>{`§f@bedrock-core/ui flex demo §7#${refreshVersion}`}</Text>
            <Button onPress={(): void => setRefreshVersion(v => v + 1)}>
              <Text>{'§aRefresh'}</Text>
            </Button>
          </Panel>

          <ThemeDisplay />
          <SettingsDisplay />
          <TodoList />
          <RefTimer />

          <ThemeController onThemeChange={setTheme} />
          <SettingsController onSettingsChange={setSettings} />
          <EventCounter />
          <Counter />

          <InfoPanel />
          <ResourcesPanel />
          <GridLayoutPanel />
          <ExitPanel />
          <InventoryPanel />
        </Panel>
      </SettingsContext>
    </ThemeContext>
  );
}
