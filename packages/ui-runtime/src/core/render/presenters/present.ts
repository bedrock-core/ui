import { type Player } from '@minecraft/server';
import { presentCompiledModal } from '../../../hosts/form/modal';
import { presentCompiledForm } from '../../../hosts/form/runtime';
import type { JSX } from '../../../jsx';
import { presentAction } from './presentAction';
import { presentModal } from './presentModal';
import { findModalConfig, type PresentResult } from './shared';

/**
 * Build and show one form snapshot for `player`, dispatching by form mode detected on
 * the built tree: a `<Form>` marker routes to the native modal backend
 * ({@link presentModal}); otherwise the default ActionForm backend ({@link presentAction})
 * renders.
 *
 * @param player - Player to show the form to.
 * @param tree - Fully built tree for this snapshot.
 * @param compiledTitle - The title this screen's compiled layout is picked by,
 *   when the build compiled it. Absent means the interpreter draws it.
 * @returns `'present'` to re-render immediately (programmatic close), `'cleanup'` to
 *   tear the session down, or `'none'` when the player dismissed with no callback.
 */
export async function present(
  player: Player,
  tree: JSX.Element,
  compiledTitle?: string,
): Promise<PresentResult> {
  const modalConfig = findModalConfig(tree);

  if (modalConfig) {
    // A modal's typed controls are the engine's either way — there is no
    // compiling those. What being compiled changes is everything AROUND them:
    // the layout is a definition in the pack, so the title names it instead of
    // carrying it, and each field's label goes over bare instead of carrying a
    // serialized control block.
    return compiledTitle === undefined
      ? presentModal(player, tree, modalConfig)
      : presentCompiledModal(player, tree, modalConfig, compiledTitle);
  }

  if (compiledTitle !== undefined) {
    return presentCompiledForm(player, tree, compiledTitle);
  }

  return presentAction(player, tree);
}
