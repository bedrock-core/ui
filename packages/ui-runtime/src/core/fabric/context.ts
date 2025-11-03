import { JSX } from '../../jsx';
import { Context, ContextProps } from './types';

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
  // We use the provider function itself as the unique identity for this context.
  const Ctx = (props: ContextProps<T>): JSX.Element => ({
    type: 'context-provider',
    props: {
      __context: Ctx,
      value: props.value,
      children: props.children,
    },
  });

  Ctx.defaultValue = defaultValue;

  return Ctx;
}
