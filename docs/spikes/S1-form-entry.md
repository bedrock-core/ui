# S1 — can a placed control own a form entry?

**Status: not yet run.** Fill in Result and Verdict from the game, then delete the harness (see [Cleanup](#cleanup)) whichever way it goes.

## Why it is the first spike

Everything in [04-hosts](../04-hosts.md#the-form-hosts-concretely) that makes a compiled form worth building rests on one assumption: that a compiled screen can place its own controls and simply *tell* each one which `form_buttons` entry it belongs to — instead of every control being instantiated N times by vanilla's `server_form_factory` and gating itself on a decoded `#type`.

If that holds, a form cell becomes an ordinary control with a literal `collection_index`, and the interpreter's ~19-controls-per-entry fan-out and ~28 slice bindings per cell go away. If it does not, presses have to keep coming from the factory and only the *drawing* can be compiled — a materially different design. Cheaper to measure than to guess.

## The two halves

| | Question | How to read it |
| --- | --- | --- |
| **READ** | Does a baked `collection_index` bind that entry's data? | Each row draws its own `#form_button_text`. Three rows reading ENTRY-0 / ENTRY-1 / ENTRY-2 = yes. All three the same, or all blank = no. |
| **PRESS** | Does `button.form_button_click` on such a control come back as `response.selection` with that index? | Press row *n*; the chat prints `selection=`. `selection=n` = yes. |

## Running it

1. Build and deploy the reference addon (`yarn workspace @bedrock-core/ui-resource-pack run build`, or `yarn watch`).
2. In the world, press a **jungle button**.
3. Read the three rows, then press the middle one and read chat.

The form's title is `bcuiv0008SPIKE_S1` — the protocol header (which switches the library's own container on and vanilla's `long_form` off) plus the marker the spike root gates on. The three entries carry deliberately invalid payloads, so the library's normal cells find no type they recognise and hide, leaving only the spike's rows on screen.

## Where it lives

Nothing vanilla is touched, so a plain chest, a plain form and every normal screen are unaffected whatever happens.

| File | What it is |
| --- | --- |
| `packages/resource-pack/packs/RP/ui/core-ui/spikes/form_entry.json` | the controls, and the question in full |
| `packages/resource-pack/packs/RP/ui/core-ui/common/action_container.json` | one added child, `spike@core_ui_spike.form_entry_root` |
| `packages/resource-pack/packs/RP/ui/_ui_defs.json` | one added line |
| `packages/resource-pack/packs/BP/scripts/spikes/formEntry.ts` | opens the form, prints the outcome |
| `packages/resource-pack/packs/BP/scripts/main.ts` | the jungle-button branch |

## Result

*Fill in what actually happened — including a partial or surprising result, which is worth more than a clean one.*

- Rows drawn:
- Captions read:
- `selection` on pressing row 0 / 1 / 2:
- Anything in the content log:

## Verdict

*One of:*

- **Both halves hold** → a compiled form cell is an ordinary control with a literal index. Phase 3 proceeds as [04-hosts](../04-hosts.md) describes, and S2 collapses into it: `main_screen_content` already gates the library's container on the title, so no `server_form` re-declaration is needed — the title carries the screen key and the container mounts that screen's root.
- **READ holds, PRESS does not** → compile the drawing, keep the presses. Every pressable cell stays a factory instantiation; everything static becomes a placed control. Re-cost phase 3 before starting it.
- **Neither holds** → the entry model is wrong for forms. Re-open [04-hosts](../04-hosts.md#the-form-hosts-concretely) before writing any of phase 3.

## Cleanup

Delete the five entries above and this page's harness section once the verdict is recorded. Keep the verdict — in `docs/docs/ui/container-screens/findings.md` if it is a JSON UI fact worth keeping, which a negative result certainly is.

## Not covered here

S3 (a modal field's label as an entry), S4 (a client-only toggle group) and S6 (writing a rect at runtime) each need their own harness. They are deliberately not in this file: a definition error in a shared spike file would sink S1 too, and S1 is the one that decides whether the rest is worth running.
