import { Context } from '../core/context';
import { getCurrentActiveRegistry } from '../core/fiber';
import { SuspenseContext, type SuspenseBoundary } from '../components/Suspense';

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
  const value: T = getCurrentActiveRegistry().readContext(context);

  // Special handling for SuspenseContext: automatically register this component with the boundary
  // Check if the context is SuspenseContext by comparing objects (since Context<T> is a class)
  const isSuspenseCtx = (context as unknown) === (SuspenseContext as unknown);
  if (isSuspenseCtx && value) {
    const suspenseBoundary = value as unknown as SuspenseBoundary;
    if (suspenseBoundary?.id) {
      // Get the current instance from the fiber stack
      const currentInstance = getCurrentActiveRegistry().getCurrentInstance();
      if (currentInstance) {
        suspenseBoundary.instanceIds.add(currentInstance.id);
      }
    }
  }

  return value;
}
