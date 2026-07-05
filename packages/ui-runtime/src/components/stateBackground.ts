import { UNSTYLED_TEXTURE } from './control';

/** Stateful-surface texture props shared by interactive primitives (Button, form fields). */
export interface StateBackgroundProps {
  /** Base texture. Defaults to the unstyled placeholder. */
  background?: string;
  /** Hover-state texture. Defaults to the resolved base texture. */
  backgroundHover?: string;
  /** Pressed-state texture. Defaults to the resolved base texture. */
  backgroundPressed?: string;
  /** Locked/disabled-state texture. Defaults to the resolved base texture. */
  backgroundLocked?: string;
}

/**
 * ONE resolution rule for every stateful surface: `state ?? base ?? unstyled`.
 * The serialized fields therefore always carry a concrete texture path (fixed-width
 * payload fields — an empty string costs the same bytes), so the RP's empty-field
 * fallback gates never fire and a custom base can never be paired with a mismatched
 * default state. Elements that don't support a state simply skip that field.
 */
export function resolveStateBackgrounds(props: StateBackgroundProps): Required<StateBackgroundProps> {
  const background = props.background ?? UNSTYLED_TEXTURE;

  return {
    background,
    backgroundHover: props.backgroundHover ?? background,
    backgroundPressed: props.backgroundPressed ?? background,
    backgroundLocked: props.backgroundLocked ?? background,
  };
}
