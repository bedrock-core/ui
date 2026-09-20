# S1 — can a placed control own a form entry?

**Status: answered 2026-08-27. Yes, both halves — and the mechanism is named.** The harness has been deleted. Commit `85ec6b2` holds **round 1**, the version that does *not* work; round 2 was never committed. What matters from it is not the code but the binding below, which now lives in `hosts/form/contract.ts` as `DETAILS_BINDING` and in the findings page.

> A control the pack places itself owns a `form_buttons` entry when **the control itself** carries a `collection_details` binding on that collection, under a host supplying the `collection_index`. Without that binding the press still routes — the form closes — but arrives as `canceled`, indistinguishable from Esc.

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

It took two rounds, and the second round is the finding.

**Round 1** — buttons with no bindings of their own, reading their entry only through the index their host applied. The rows drew and could be pressed, but *every* press came back `canceled`, exactly like Esc. The click routed somewhere; the engine had nothing to attribute it to.

**Round 2** — rows 0–2 gained a `collection_details` binding **on the button control itself**; row 3 kept the round-1 shape as the control. `core_ui_common.control` had said why in as many words all along: `$cell_details_binding_type` is required on a form button because *"the per-cell collection index is what routes `button.form_button_click` to the right form button."*

| Row | Button's own bindings | Pressed → |
| --- | --- | --- |
| 0 | `collection_details` + `#form_button_text` on `form_buttons` | `selection=0` |
| 1 | same | `selection=1` |
| 2 | same | `selection=2` |
| 3 | none | `canceled` |

Each row reporting *its own* index — rather than all three reporting 0 — is also the read half: the baked `collection_index` resolves per control, or the presses could not have been told apart.

## Verdict

**Both halves hold.** A compiled form cell is an ordinary control with a literal index, and the interpreter's per-entry fan-out is not needed to make a button work. Phase 3 proceeds as [04-hosts](../04-hosts.md#the-form-hosts-concretely) describes, with one rule now known rather than assumed:

> Every control that must report a press carries its own `collection_details` binding on `form_buttons`. It is not enough for an ancestor to supply the index, and the failure is silent — a press that looks like a dismissal.

**S2 collapses into phase 3** and does not need its own spike. `main_screen_content` already gates the library's container on the protocol header, and `action_container` — which the library owns and which declares its own `controls` — is a working mount that took a placed subtree without a single vanilla edit. A compiled screen needs no `server_form` re-declaration: the title carries the screen key, and the container mounts that screen's root.

The durable engine fact is recorded in `docs/docs/ui/container-screens/findings.md`, which outlives this page.

## What this does not answer

S3 (a modal field's label as an entry), S4 (a client-only toggle group) and S6 (writing a rect at runtime) are untouched. S5 (is a compiled cell cheaper to open?) is now worth running against a real compiled screen rather than a spike.

## Not covered here

S3 (a modal field's label as an entry), S4 (a client-only toggle group) and S6 (writing a rect at runtime) each need their own harness. They are deliberately not in this file: a definition error in a shared spike file would sink S1 too, and S1 is the one that decides whether the rest is worth running.
