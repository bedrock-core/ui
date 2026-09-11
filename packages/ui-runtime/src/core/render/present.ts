import { type Player } from '@minecraft/server';
import { findModalConfig } from '../../components/Form';
import { presentCompiledModal } from '../../hosts/form/modal';
import { presentCompiledForm } from '../../hosts/form/runtime';
import type { JSX } from '../../jsx';
import { getFibersForOwner, playerOwner } from '../fabric';
import type { CompiledSnapshot } from './screens';
import { beginInteractiveTransaction, endInteractiveTransaction } from './session';

/**
 * Outcome of presenting one form snapshot:
 * - `'present'` — re-render immediately (a callback requested another snapshot).
 * - `'cleanup'` — tear the session down (ESC / dismissal / programmatic exit).
 * - `'none'`    — player dismissed with no callback; do nothing.
 */
export type PresentResult = 'present' | 'cleanup' | 'none';

// The modal marker is the Form component's own business; a host reads it through
// this module, which is where the two backends are told apart.
export { findModalConfig };

/** What a compiled present carries beyond the tree: identity, reference, verbosity. */
export interface CompiledPresent {
  readonly snapshot?: CompiledSnapshot;
  readonly debug?: boolean;
}

/**
 * Run a form callback inside an interactive transaction (background logic passes
 * suppressed for its lifetime), then decide whether the session should re-present or
 * tear down. Shared by both the action-form button path and the modal submit/cancel
 * path so the transaction + cleanup semantics stay identical.
 *
 * @param player - Player whose session the callback runs against.
 * @param callback - The form callback (`onPress` / `onSubmit` / `onCancel`).
 * @returns `'cleanup'` if a fiber requested exit during the callback, else `'present'`.
 */
export async function runInteractiveCallback(
  player: Player,
  callback: () => unknown | Promise<unknown>,
): Promise<PresentResult> {
  const owner = playerOwner(player);

  beginInteractiveTransaction(owner);

  return Promise.resolve()
    .then(() => callback())
    .finally(() => {
      endInteractiveTransaction(owner);
    })
    .then(() => {
      const shouldClose: boolean = getFibersForOwner(owner).some(fiber => !fiber.shouldRender);

      return shouldClose ? 'cleanup' : 'present';
    });
}

/**
 * Build and show one form snapshot for `player`, on the backend the built tree
 * asks for: a `<Form>` marker routes to the native modal, everything else to
 * the action form.
 *
 * Both draw the screen from its compiled layout in the pack — the title picks
 * it — so only what changed between snapshots travels.
 *
 * @param player - Player to show the form to.
 * @param tree - Fully built tree for this snapshot.
 * @param compiledTitle - The title this screen's compiled layout is picked by.
 * @returns `'present'` to re-render immediately (programmatic close), `'cleanup'` to
 *   tear the session down, or `'none'` when the player dismissed with no callback.
 */
export async function present(
  player: Player,
  tree: JSX.Element,
  compiledTitle: string,
  compiled: CompiledPresent = {},
): Promise<PresentResult> {
  const modalConfig = findModalConfig(tree);

  // A modal's typed controls are the engine's either way — there is no
  // compiling those. What the compiled layout changes is everything AROUND
  // them: the title names a definition in the pack, and each field's label goes
  // over bare.
  return modalConfig
    ? presentCompiledModal(player, tree, modalConfig, compiledTitle, compiled.snapshot, compiled.debug)
    : presentCompiledForm(player, tree, compiledTitle, compiled.snapshot, compiled.debug);
}
