import { back, navigate, type NavigateOptions, type ScreenKey } from '../core/navigate';
import type { PressEvent } from '../core/events';
import { FunctionComponent, JSX } from '../jsx';
import { Button, type ButtonProps } from './Button';

/** The prop a link's target travels on, read by the build off the built button. */
const LINK_TO = 'linkTo';

/** The prop that marks a link as the way back, rather than a key. */
const LINK_BACK = 'linkBack';

/** The prop that marks a link as replacing the screen it leaves. */
const LINK_REPLACE = 'linkReplace';

export interface LinkProps extends Omit<ButtonProps, 'onPress'> {
  /**
   * The screen to open: `<addon>:<name>`, as the build wrote it. This addon's own
   * keys are offered by the editor — the build declares them — and another
   * addon's key is accepted as written, since this build never saw it.
   */
  to?: ScreenKey;
  /**
   * The way back: the screen the player came from, whatever it was. Set instead
   * of `to` — a screen cannot name what opened it, and a screen shown by another
   * addon could not name it even if it wanted to.
   */
  back?: boolean;
  /** Props the target screen is rendered with; see {@link NavigateOptions.params}. */
  params?: NavigateOptions['params'];
  /**
   * Take the place of the screen this link is on rather than stacking over
   * it, so a back from the target returns to what was under THIS screen. For
   * moving sideways — the pages of a guide, the tabs of a set — where the
   * screens are peers and none of them is the way back to another.
   */
  replace?: boolean;
}

/**
 * A button that goes somewhere.
 *
 * The difference from a `<Button onPress={…}>` that renders a screen is that the
 * destination is DATA: a key on the element, which the build reads straight off
 * the tree. That is what lets a screen of links be described to another addon —
 * its reference is the title, the entry values and one target per entry — and
 * shown by a realm running none of the owner's script.
 *
 * A press resolves through the installed navigator, so where it leads is decided
 * per realm: this bundle's own screen when it has one, a replicated reference
 * otherwise. `back` is the same thing for the other direction: the player's own
 * stack decides, and a host walking a reference is told the press was a back
 * rather than a dismissal — which nothing else can tell it, since closing the
 * form and pressing nothing look identical from the outside.
 */
export const Link: FunctionComponent<LinkProps> = ({ to, back: isBack, params, replace, ...rest }: LinkProps): JSX.Element => {
  const button = Button({
    ...rest,
    onPress: ({ player }: PressEvent): void => {
      if (to !== undefined) {
        navigate(to, player, { ...params === undefined ? {} : { params }, ...replace === true ? { replace: true } : {} });

        return;
      }

      back(player);
    },
  });

  return {
    ...button,
    props: {
      ...button.props,
      ...to === undefined ? {} : { [LINK_TO]: to },
      ...isBack === true ? { [LINK_BACK]: true } : {},
      ...to !== undefined && replace === true ? { [LINK_REPLACE]: true } : {},
    },
  };
};

/** Where a press leads, as the build reads it off one element. */
export type LinkTarget = { readonly to: string; readonly replace?: true } | { readonly back: true };

/**
 * Where a built button goes, when it is a `<Link>`. Undefined for an ordinary
 * button: what its press does is script the build cannot read.
 */
export function linkTarget(element: JSX.Element): LinkTarget | undefined {
  const to = element.props[LINK_TO];

  if (typeof to === 'string') {
    return element.props[LINK_REPLACE] === true ? { to, replace: true } : { to };
  }

  return element.props[LINK_BACK] === true ? { back: true } : undefined;
}
