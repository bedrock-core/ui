import { FunctionComponent, JSX } from '../../jsx';

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
export type Context<T> = FunctionComponent<ProviderProps<T>> & {
  $$typeof: symbol;
  defaultValue: T;
};

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
  const identity = { $$typeof: Symbol('ctx'), defaultValue };

  const Provider: FunctionComponent<ProviderProps<T>> = (
    props: ProviderProps<T>,
  ): JSX.Element => {
    const providerProps = {
      __context: identity,
      value: props.value,
      children: props.children,
    } as unknown as JSX.Props;

    return {
      type: 'context-provider',
      props: providerProps,
    };
  };

  // Make the context object itself callable as a Provider
  const ContextComponent = Object.assign(Provider, {
    $$typeof: identity.$$typeof,
    defaultValue: identity.defaultValue,
  });

  return ContextComponent;
}
