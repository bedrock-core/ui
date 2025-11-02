import { FunctionComponent, JSX } from '../jsx';
import { createFiberContext } from './fabric';

/**
 * Context symbol for identifying context objects
 */
const CONTEXT_SYMBOL = Symbol.for('core-ui.context');

/**
 * Props for Context.Provider component
 */
export interface ProviderProps<T> {
  value: T;
  children?: unknown;
}

/**
 * Context object created by createContext
 */
export interface Context<T> {
  // Fiber2 identity fields
  id: symbol;
  defaultValue: T;

  // Legacy marker for isContext checks
  $$typeof: symbol;

  // Provider component for setting context value
  Provider: FunctionComponent<ProviderProps<T>>;
}

/**
 * Creates a Context object that components can use to share values down the component tree
 * without passing props through every level.
 *
 * @param defaultValue - The value used when a component consumes the context
 *                       but there is no matching Provider above it in the tree
 * @returns Context object with a Provider component
 *
 * @example
 * const ThemeContext = createContext<'light' | 'dark'>('light');
 *
 * function App() {
 *   return (
 *     <ThemeContext.Provider value="dark">
 *       <ThemedComponent />
 *     </ThemeContext.Provider>
 *   );
 * }
 *
 * function ThemedComponent() {
 *   const theme = useContext(ThemeContext);
 *   return <Panel>{theme}</Panel>;
 * }
 */
export function createContext<T>(defaultValue: T): Context<T> {
  const f2Ctx = createFiberContext<T>(defaultValue) as unknown as Context<T>;
  (f2Ctx as unknown as { $$typeof: symbol }).$$typeof = CONTEXT_SYMBOL;

  const Provider: FunctionComponent<ProviderProps<T>> = (
    props: ProviderProps<T>,
  ): JSX.Element => {
    const providerProps = {
      __context: f2Ctx,
      value: props.value,
      children: props.children,
    } as unknown as JSX.Props;

    return {
      type: 'context-provider',
      props: providerProps,
    };
  };

  f2Ctx.Provider = Provider;

  return f2Ctx;
}

/**
 * Type guard to check if a value is a Context object
 */
export function isContext<T>(value: unknown): value is Context<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Context<T>).$$typeof === CONTEXT_SYMBOL
  );
}
