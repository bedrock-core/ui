import { HostContext } from '../core/hostContext';
import { SCREEN_TYPE } from '../core/roots';
import type { FunctionComponent, JSX } from '../jsx';

/**
 * The host `type` emitted by {@link Screen}. Registered transparent: it has no
 * box of its own, so its children are laid out against the canvas exactly as
 * they would be at the top of the tree. The host registry reads it to know
 * the screen is an action form.
 */
export { SCREEN_TYPE };

export interface ScreenProps {
  /** The screen's content, laid out against the form canvas. */
  children?: JSX.Node;
  /**
   * Declares that this screen carries no live value and no press of its own:
   * every string is baked and every press is a `<Link>`.
   *
   * Such a screen needs nothing at runtime — no component, no tree to walk —
   * because the build already knows its title, the value each entry is shown
   * with, and where each press leads. Setting this both asks for that and
   * PROVES it: a screen that turns out to carry live text, a carried visible,
   * or a handler the build cannot read fails the build instead of quietly
   * keeping its component.
   */
  static?: boolean;
}

/**
 * Root that makes a screen an action form: buttons, decoration and the lists
 * and scrolls between them, shown to one player with `render()`.
 *
 * A screen's root names its host, and there is no default — `<Screen>` is an
 * action form the way `<Form>` is a native modal and `<Container>` a
 * compiled container screen. It is the one element an author writes at the
 * top of a `*.screen.tsx`; a component library never renders one.
 *
 * ```tsx
 * export default function Players(): JSX.Element {
 *   return (
 *     <Screen>
 *       <Card width={300} height={200}>…</Card>
 *     </Screen>
 *   );
 * }
 * ```
 */
export const Screen: FunctionComponent<ScreenProps> = ({ children, static: isStatic }: ScreenProps): JSX.Element =>
  HostContext({
    value: 'form-action',
    children: { type: SCREEN_TYPE, props: { children, ...isStatic === true ? { static: true } : {} } },
  });

/** Whether a built screen declared itself static; read by the build off the root. */
export function declaredStatic(element: JSX.Element): boolean {
  return element.props['static'] === true;
}
