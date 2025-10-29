import { FunctionComponent, JSX } from '../jsx';

/**
 * Context symbol for identifying context objects
 */
const CONTEXT_SYMBOL = Symbol.for('bedrock.context');

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

  /** Symbol identifying this as a context object */
  $$typeof: symbol;

  /** Current value of the context (used when no Provider is found) */
  currentValue: T;

  /** Default value provided at creation time */
  defaultValue: T;

  /** Provider component for setting context value */
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
  const context: Context<T> = {
    $$typeof: CONTEXT_SYMBOL,
    currentValue: defaultValue,
    defaultValue,
    // Provider will be assigned below
    Provider: null as unknown as FunctionComponent<ProviderProps<T>>,
  };

  // Create Provider component
  const Provider: FunctionComponent<ProviderProps<T>> = (
    props: ProviderProps<T>,
  ): JSX.Element => {
    // Store context and value in a way that bypasses type checking
    // since we're using this internally and the serializer won't touch these props
    const providerProps = {
      __context: context,
      value: props.value,
      children: props.children,
    } as unknown as JSX.Props;

    return {
      type: 'context-provider',
      props: providerProps,
    };
  };

  context.Provider = Provider;

  return context;
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
