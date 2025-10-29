import { JSX, useState } from '@bedrock-core/ui';

// Import all grid components
import {
  Counter,
  EventCounter,
  ExitPanel,
  GridLayoutPanel,
  InfoPanel,
  RefTimer,
  ResourcesPanel,
  SettingsController,
  SettingsDisplay,
  ThemeController,
  ThemeDisplay,
  TodoList
} from './components';

// Import contexts
import { SettingsContext, ThemeContext, type Settings, type Theme } from './contexts';

/**
 * ============================================================================
 * COMPREHENSIVE HOOKS DEMONSTRATION
 * ============================================================================
 *
 * This file demonstrates ALL available hooks in @bedrock-core/ui:
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
 *    - Providers: ThemeContext.Provider, SettingsContext.Provider
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

  return (
    <ThemeContext.Provider value={theme}>
      <SettingsContext.Provider value={settings}>
        {/* Row 1: Context and State Demonstrations */}
        <ThemeDisplay />
        <SettingsDisplay />
        <TodoList />
        <RefTimer />

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

