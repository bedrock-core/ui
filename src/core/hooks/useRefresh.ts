import { fiberRegistry } from '../fiber';
import { render } from '../render';
import { system } from '@minecraft/server';

/**
 * Hook that provides refresh functions for UI updates.
 *
 * Returns an object with two functions:
 * - `refresh()`: Lightweight - signals refresh intent (re-renders on next button press)
 * - `forceRefresh()`: Immediate - forces re-render on next tick (⚠️ causes focus loss)
 *
 * In the static form architecture, normal re-renders happen on button presses.
 * Use `refresh()` for button handlers to explicitly signal UI update.
 * Use `forceRefresh()` only when absolutely necessary (critical state changes).
 *
 * @returns Object with `refresh` and `forceRefresh` functions
 *
 * @example
 * function RefreshButton() {
 *   const { refresh } = useRefresh();
 *
 *   return (
 *     <Button onPress={refresh}>
 *       <Text>Refresh UI</Text>
 *     </Button>
 *   );
 * }
 *
 * @example
 * // Using both functions
 * function SmartPanel() {
 *   const { refresh, forceRefresh } = useRefresh();
 *   const [stats, setStats] = useState({ kills: 0 });
 *
 *   useEffect(() => {
 *     world.afterEvents.entityDie.subscribe(() => {
 *       setStats(prev => ({ ...prev, kills: prev.kills + 1 }));
 *       // Only force refresh on critical kills
 *       if (stats.kills % 10 === 0) {
 *         forceRefresh(); // Every 10 kills
 *       }
 *     });
 *   }, [stats.kills]);
 *
 *   return (
 *     <Panel>
 *       <Text value={`Kills: ${stats.kills}`} />
 *       <Button onPress={refresh}>
 *         <Text value="Refresh Stats" />
 *       </Button>
 *     </Panel>
 *   );
 * }
 *
 * @example
 * // Multiple effects with one refresh button
 * function TrackerPanel() {
 *   const { refresh } = useRefresh();
 *   const [stats, setStats] = useState({ kills: 0, blocks: 0 });
 *
 *   // Background effects update stats silently
 *   useEffect(() => {
 *     world.afterEvents.entityDie.subscribe(() => {
 *       setStats(prev => ({ ...prev, kills: prev.kills + 1 }));
 *     });
 *   }, []);
 *
 *   useEffect(() => {
 *     world.afterEvents.blockBreak.subscribe(() => {
 *       setStats(prev => ({ ...prev, blocks: prev.blocks + 1 }));
 *     });
 *   }, []);
 *
 *   return (
 *     <Panel>
 *       <Text value={`Kills: ${stats.kills}`} />
 *       <Text value={`Blocks: ${stats.blocks}`} />
 *       <Button onPress={refresh}>
 *         <Text value="Refresh Stats" />
 *       </Button>
 *     </Panel>
 *   );
 * }
 */
export interface RefreshFunctions {

  /**
   * Signal UI refresh - re-renders on next button press.
   * Lightweight, no accessibility impact. Preferred method.
   */
  refresh: () => void;

  /**
   * ⚠️ WARNING: Causes focus loss and cursor reset. Use sparingly!
   * Force immediate UI re-render on next tick.
   * @deprecated
   */
  forceRefresh: () => void;
}

export function useRefresh(): RefreshFunctions {
  const instance = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error(
      'useRefresh can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  const refresh = (): void => {
    // Just return - the button press itself will trigger the re-render
    // This is essentially a no-op, but it makes the intent explicit
  };

  /**
   * @deprecated ⚠️ WARNING: Causes focus loss and cursor reset. Use sparingly!
   */
  const forceRefresh = (): void => {
    // Warn about accessibility impact
    console.warn(
      `[forceRefresh] Forcing immediate render for component ${instance.id}. ` +
      'This will close and reopen the form, causing focus loss and cursor reset. ' +
      'Consider using refresh() in button handlers instead for better UX.',
    );

    // Schedule render on next tick - gives system time to batch operations
    system.run((): void => {
      render(instance.player, instance.componentType, instance.options);
    });
  };

  return { refresh, forceRefresh };
}
