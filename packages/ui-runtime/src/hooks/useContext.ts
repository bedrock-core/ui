import { Context } from '../core/context';
import { fiberRegistry } from '../core/fiber';

/**
 * useContext hook - reads the current value of a context
 * @param context - Context object created by createContext
 * @returns Current value of the context
 *
 * @example
 * const ThemeContext = createContext<'light' | 'dark'>('light');
 *
 * function ThemedButton() {
 *   const theme = useContext(ThemeContext);
 *   return <Button>{theme}</Button>;
 * }
 *
 * @remarks
 * - Reads from the nearest Context.Provider above in the tree
 * - Falls back to the default value if no Provider exists
 * - Component re-renders when parent component re-renders (which updates context)
 * - Does NOT use the hook system (to avoid polluting parent hook arrays)
 * - Can be called from any component, including child components without their own instances
 */
export function useContext<T>(context: Context<T>): T {
  // Read current context value from the context stack
  // This works even if there's no current instance (child components)
  const value: T = fiberRegistry.readContext(context);

  return value;
}
