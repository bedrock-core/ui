import { JSX } from '../jsx/jsx-runtime';
import type { LayoutProps } from './layout';

/**
 * Blank-canvas placeholder texture (3×3 nineslice, 1px borders) — the default look
 * of every primitive surface the user hasn't styled.
 */
export const UNSTYLED_TEXTURE = 'textures/ui/unstyled';

export interface ControlProps extends LayoutProps {
  visible?: boolean;
  /**
   * Carry `visible` on a compiled screen whether or not the build's liveness
   * probe sees it flip — the probe perturbs each state slot a few ways, and a
   * visibility that is false in every one of them is otherwise baked hidden.
   * The conditional sugar sets this on every `{cond && <X/>}` it rewrites: a
   * condition an author wrote is dynamic by intent.
   */
  liveVisible?: boolean;
  enabled?: boolean;
  background?: string;
}

// StateBackgroundProps + resolveStateBackgrounds moved to ./stateBackground; re-exported
// here so existing `from '../control'` imports keep working.
export { resolveStateBackgrounds, type StateBackgroundProps } from './stateBackground';

/**
 * The props every control carries, whatever it draws.
 *
 * Two jobs. The layout phase reads `__layout` and writes the computed geometry
 * back into `jsonUIx/y/Width/Height`, which is what the compiler emits as the
 * control's offset and size. And the values a control has regardless of type —
 * shown, enabled, its background, the scroll it sits in, its font — are given
 * defaults here so every pass can read them without asking whether the author
 * set them.
 *
 * `region` is filled in by the region-propagation pass with the nearest scroll
 * ancestor's index; `fontType` is a valid engine alias on every control, not
 * just text, because the label the pack mounts reads that slot for any cell.
 *
 * The geometry defaults are placeholders: use the flex props (`flexGrow`,
 * `width`, …) rather than setting `jsonUI*` by hand.
 *
 * @param props Component properties extending ControlProps
 * @returns The control's props, defaults filled in
 */
export function withControl(props: JSX.Props): JSX.Props {
  const {
    visible,
    liveVisible,
    enabled,
    background,
    // Layout props
    width,
    height,
    display,
    flexDirection,
    justifyContent,
    alignItems,
    alignContent,
    wrap,
    gap,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    flexGrow,
    flexShrink,
    flexBasis,
    flex,
    alignSelf,
    margin,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    aspectRatio,
    // Positioning
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
  } = props;

  return {
    visible: visible ?? true,
    ...liveVisible === true ? { liveVisible: true } : {},
    enabled: enabled ?? true,

    background: background ?? '',
    // The scroll this control sits in. 0 until the region-propagation pass
    // overwrites it with the nearest scroll ancestor's index.
    region: 0,
    // A valid engine alias on every control, not only text; `Text` overwrites it.
    fontType: 'default',

    // Read by the layout phase, which writes its result back above.
    __layout: {
      display,
      width,
      height,
      flexDirection,
      justifyContent,
      alignItems,
      alignContent,
      wrap,
      gap,
      padding,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      flex,
      flexGrow,
      flexShrink,
      flexBasis,
      alignSelf,
      margin,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      aspectRatio,
      position,
      top,
      right,
      bottom,
      left,
      zIndex,
    },
  };
}

/**
 * Whether an element is a CONTROL — something with a box — rather than
 * structure the passes walk through.
 *
 * Asked before the layout phase has run, so it cannot look at the geometry:
 * `__layout` is what {@link withControl} puts there and what the layout phase
 * reads, and having it is what makes an element a control.
 */
export function isControlled(props: JSX.Props): boolean {
  return typeof props['__layout'] === 'object' && props['__layout'] !== null;
}
