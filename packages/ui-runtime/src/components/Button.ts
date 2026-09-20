import { isContainerExit } from '../core/fabric/exit';
import type { PressEvent } from '../core/events';
import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, resolveStateBackgrounds, StateBackgroundProps, withControl } from './control';

/** The host `type` emitted by {@link Button}. */
export const BUTTON_TYPE = 'button';

export interface ButtonProps extends ControlProps, StateBackgroundProps {
  children?: JSX.Node;
  /**
   * Ran on a press, with the player who pressed. On a screen an entity owns,
   * `event.host` is that entity; on a form there is none.
   */
  onPress?: (event: PressEvent) => unknown | Promise<unknown>;
  /**
   * Draw the press around what its children draw rather than in the box the
   * layout solved, so it covers exactly the glyphs the client shows — whichever
   * language it shows them in. For a link inside a line of text in a
   * `<Panel stack>`, whose children hug their own glyphs; compiled forms only.
   */
  hug?: boolean;
  // state textures serialize at [1024-1106] hover / [1107-1189] pressed /
  // [1190-1272] locked, resolved by the shared `state ?? base ?? unstyled` rule
}

export const Button: FunctionComponent<ButtonProps> = ({ onPress, backgroundHover, backgroundPressed, backgroundLocked, hug, children, ...rest }: ButtonProps): JSX.Element => {
  const states = resolveStateBackgrounds({ background: rest.background, backgroundHover, backgroundPressed, backgroundLocked });

  return {
    type: BUTTON_TYPE,
    props: {
      ...withControl({ ...rest, background: states.background }),
      backgroundHover: states.backgroundHover,
      backgroundPressed: states.backgroundPressed,
      backgroundLocked: states.backgroundLocked,
      onPress: onPress ?? ((): void => {}),
      // Private: the build reads it off the element, and no payload has a field for it.
      ...hug === true ? { __hug: true } : {},
      children,
    },
  };
};

/**
 * Whether a built `<Button>` is a container screen's close button: its press
 * is the handle `useExit()` gives a container. It draws like any button but
 * takes no slot — the client closes the screen, and script hears the close.
 */
export function isExitButton(element: JSX.Element): boolean {
  return isContainerExit(element.props.onPress);
}

/**
 * The cell a built `<Button>` claims in the screen's container: a button
 * slot, unless it is the close button — that press is the client's, so it
 * takes no slot and the runtime never polls it.
 */
export function buttonCell(element: JSX.Element): 'button' | undefined {
  return element.type === BUTTON_TYPE && !isExitButton(element) ? 'button' : undefined;
}
