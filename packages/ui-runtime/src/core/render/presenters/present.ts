import { type Player } from '@minecraft/server';
import { presentCompiledModal } from '../../../hosts/form/modal';
import { presentCompiledForm } from '../../../hosts/form/runtime';
import type { JSX } from '../../../jsx';
import type { CompiledSnapshot } from '../screens';
import { findModalConfig, type PresentResult } from './shared';

/** What a compiled present carries beyond the tree: identity, reference, verbosity. */
export interface CompiledPresent {
  readonly snapshot?: CompiledSnapshot;
  readonly debug?: boolean;
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
