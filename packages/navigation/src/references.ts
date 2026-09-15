/**
 * What resolves a screen key this bundle did not compile.
 *
 * A realm holds every addon's replicated reference — the title, the entry values and where each
 * press leads — so a foreign key is shown from that and followed for as long as its presses are
 * links. A screen whose presses run its owner's own handlers cannot be replicated, so it is drawn
 * where that script runs, which is what {@link CrossRealm} reaches.
 */
import type { Player } from '@minecraft/server';
import {
  openScreen,
  presentReference,
  screenOwner,
  setNavigator,
  type Navigated,
  type ReturnAddress,
  type ScreenReference,
} from '@bedrock-core/ui-runtime';

/**
 * Reaching the realm that owns a screen, for the screens no reference describes.
 *
 * Both calls cross the edge of this realm, which is why they are supplied by whoever has a
 * transport rather than reached for from the navigation package.
 */
export interface CrossRealm {
  /**
   * Asks the realm of `owner` to show `key` to `player`, saying where a `back()` that runs out of
   * screens over there should return to. True when the request went out.
   */
  ask(owner: string, key: string, player: Player): boolean;
  /** Shows the player what the realm they came from had on screen. */
  sendBack(address: ReturnAddress, rest: readonly ReturnAddress[], player: Player): boolean;
}

/**
 * Installs what resolves a key this bundle did not compile. Called once with whatever reads the
 * feed:
 *
 * ```ts
 * provideReferences(key => screens(core).find(key));
 * ```
 *
 * Pass `crossRealm` to reach a screen no reference describes; without one, such a key warns
 * exactly as an unknown key does. Until this is called, a key this bundle did not compile warns
 * and shows nothing.
 */
export function provideReferences(
  lookup: (key: string) => ScreenReference | undefined,
  crossRealm?: CrossRealm,
): void {
  setNavigator({
    show: (key, player, options): Navigated => {
      if (openScreen(key, player, options)) {
        return true;
      }

      if (lookup(key) !== undefined) {
        // A foreign screen is SHOWN, not rendered: there is no component here, so the walk drives
        // the client directly — title, values, and the key each press leads to — for as long as
        // the presses are links.
        void presentReference(lookup, key, player);

        return true;
      }

      const owner = screenOwner(key);

      if (owner !== undefined && crossRealm?.ask(owner, key, player) === true) {
        return 'handed-off';
      }

      console.warn(`[ui] no screen "${key}": this bundle did not compile it and no addon has published a reference for it`);

      return false;
    },
    sendBack: crossRealm === undefined
      ? undefined
      : (address, rest, player): boolean => crossRealm.sendBack(address, rest, player),
  });
}
