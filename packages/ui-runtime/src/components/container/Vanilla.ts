import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';

export interface VanillaProps extends ControlProps {
  /** Fully qualified, e.g. `common.hotbar_grid_template`. */
  ref: string;
  /**
   * Whether to impose the solved box on it.
   *
   * Off by default, and that is the useful default: vanilla's own parts carry
   * their own anchors and offsets — the player's inventory knows it belongs at
   * the bottom — so telling them where to go moves them somewhere wrong. Turn
   * it on only for a control you actually want to place.
   */
  sized?: boolean;
}

/**
 * Instantiates a control the game already defines.
 *
 * A compiled screen owns the WHOLE chest screen — that is the point, so the
 * author decides what is on it — which means nothing vanilla appears unless it
 * is asked for. This is how you ask. It costs one control and no container
 * slots.
 */
export const Vanilla: FunctionComponent<VanillaProps> = ({
  ref,
  sized = false,
  ...rest
}: VanillaProps): JSX.Element => ({
  type: 'vanilla',
  props: {
    // Absolute unless placed on purpose, so a self-placing vanilla part does
    // not also take up a row in whatever it was dropped into.
    ...withControl(sized ? rest : { position: 'absolute', top: 0, left: 0, ...rest }),
    ref,
    sized,
  },
});

/** The chest screen's own frame and background. */
export const Background: FunctionComponent<ControlProps> = (props: ControlProps): JSX.Element =>
  Vanilla({ ...props, ref: 'common.common_panel' });

/**
 * The player's own inventory, with its label. Places itself, like vanilla's.
 *
 * Not vanilla's control but the router's redrawn copy of it, which differs in
 * exactly one way: a slot holding a button's transport item draws as empty.
 * A press auto-places its transport here, and vanilla's grid would show a
 * pickaxe flashing in and out while the script pulls it back.
 */
export const PlayerInventory: FunctionComponent<ControlProps> = (
  props: ControlProps,
): JSX.Element => Vanilla({ ...props, ref: 'chest.bcui_inventory_panel_with_label' });

/** The player's hotbar. The same redrawn grid as {@link PlayerInventory}. */
export const Hotbar: FunctionComponent<ControlProps> = (props: ControlProps): JSX.Element =>
  Vanilla({ ...props, ref: 'chest.bcui_hotbar_grid' });
