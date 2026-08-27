import type { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

/**
 * SPIKE S1 — throwaway. Delete this folder with
 * `RP/ui/core-ui/spikes/form_entry.json` once the answer is recorded in
 * `ui/docs/spikes/S1-form-entry.md`.
 *
 * The question, in full, is in the RP file. The script's whole job is to open a
 * form the spike panel recognises and print what the engine gives back.
 *
 * The title is the marker AND the protocol header, which is what makes this
 * work without touching a vanilla file: the header switches the library's own
 * container on and vanilla's `long_form` off, and the marker is what the spike
 * root gates itself on. Every real screen's title carries the header followed
 * by scroll metadata, never this, so nothing else can trip it.
 */
const SPIKE_TITLE = 'bcuiv0008SPIKE_S1';

/**
 * The entries the spike reads. Deliberately NOT valid payloads: the library's
 * own cells decode each entry's text, find no type they recognise and hide
 * themselves, so the only thing drawn is the spike's own three rows. The
 * strings are what each row should print if a baked `collection_index` really
 * binds that entry.
 */
const ENTRIES = ['ENTRY-0', 'ENTRY-1', 'ENTRY-2'] as const;

/**
 * Opens the spike form for one player and reports the outcome to their chat.
 *
 * What to look for, in order:
 *  1. Three rows, reading ENTRY-0 / ENTRY-1 / ENTRY-2 top to bottom. All three
 *     showing the same text, or none showing any, means a baked
 *     `collection_index` does not bind the entry — the READ half failed.
 *  2. Press the middle row. `selection=1` means a placed control's press
 *     reaches script as that entry — the PRESS half held, and a compiled form
 *     cell can be an ordinary control with a literal index.
 *  3. `selection=undefined`, or nothing happening at all, means presses must
 *     keep coming from vanilla's factory and only the drawing can be compiled.
 */
export function openFormEntrySpike(player: Player): void {
  const form = new ActionFormData();

  form.title(SPIKE_TITLE);

  for (const entry of ENTRIES) {
    form.button(entry);
  }

  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        player.sendMessage(`§e[S1] closed without a press (${String(response.cancelationReason)})`);

        return;
      }

      const { selection } = response;
      const expected = selection === undefined ? undefined : ENTRIES[selection];

      player.sendMessage(
        `§a[S1] selection=§f${String(selection)}§a entry=§f${expected ?? '—'}`
        + `§7  (press row n and check selection is n)`,
      );
    })
    .catch((error: unknown) => {
      player.sendMessage(`§c[S1] show() threw: ${String(error)}`);
    });
}
