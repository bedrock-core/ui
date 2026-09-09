// Placeholder. The `ui-compile` filter replaces this in the build workspace
// with one `registerCompiledScreen` call per compiled screen and the gallery
// it generates; what is committed here is only what the editor and `tsc` read
// before Regolith has ever run — the same arrangement the i18n and guides
// bundles use.
//
// Importing it is what turns compiled screens on. Without the import every
// screen still renders, serialized by the interpreter, which is what makes the
// whole feature additive.
import type { RenderOptions } from '@bedrock-core/ui';
import type { Player } from '@minecraft/server';

/** Opens the gallery of every compiled screen as faces alone. Built only with `gallery: true`. */
export function openGallery(player: Player, options: RenderOptions = {}): boolean {
  void player;
  void options;
  console.warn('[ui] this build has no gallery: set `gallery: true` on the ui-compile filter');

  return false;
}
