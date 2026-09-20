# S4 — is a toggle group client-only?

**Status: answered 2026-08-28 — YES, both mounts.** Unblocks local `Tabs`.

> A radio toggle group swaps its content with **nothing reaching script**, on the pack's own form mount AND under the modification-inserted chest mount. A tab change costs no press, no re-present and no payload.

## The question

`Tabs` is worth having only if switching tabs costs **nothing**: no press reaching script, no re-present, no payload. So the thing to watch is not that the panels swap — it is that **nothing is printed while they do**.

The content sits inside each toggle's `checked_control` rather than beside it. That is the same rule the button captions turned out to obey — a control draws the child its state names and nothing else of its own — and it is what keeps the group client-only: nothing outside has to observe the state to react to it.

## Two mounts, and only one is the one that matters

| | Mount | Why it might differ |
| --- | --- | --- |
| **a** | the pack's own form container, gated on the title | the pack declares the whole subtree; nothing is inserted |
| **b** | the chest root, reached through `modifications` | the engine stacks each pack's copy; an insert into an inherited array shadows it, and that has already bitten this codebase once |

**(b) is the one `Tabs` needs**, and the one likely to fail.

## Running it

1. `yarn watch`.
2. **Spruce button** → mount (a). Click through the three tabs.
3. **Crimson button** → mount (b). The group is top-right of the chest screen.

## How to read it

- Panels swap, chat stays silent → **client-only**. `Tabs` is free.
- The form closes, or chat prints → the group is a press. A tab change is a full rebuild, and `Tabs` costs what any other button costs.
- Works under one mount but not the other → **the mount is the answer**, and it decides where `Tabs` may live.

## Where it lives

| File | What it is |
| --- | --- |
| `packs/RP/ui/core-ui/spikes/toggle_group.json` | the group, both mounts, and the question in full |
| `packs/RP/ui/core-ui/common/action_container.json` | mount (a), gated on the spike title |
| `packs/RP/ui/core-ui/chest/chrome.json` | mount (b) — on the chrome, which asserts no fixed shape, rather than the router, whose children are pinned by a test |
| `packs/BP/scripts/spikes/toggleGroup.ts` | opens (a) and reports anything that reaches script |

Mount (b) has **no gate** — the chest is claimed by an item, not a title, so while the spike is installed the group draws on every compiled chest screen. Deliberate and temporary.

## Result

**Mount (a) — yes.** The three tabs swap their panels, and chat stays silent the whole time. The form does not close; nothing arrives as a selection or a cancel.

That is the whole claim `Tabs` rests on: a tab change is a client-side state change, not a press.

**Round 1 measured nothing**, and the fault was the harness, not the engine. The toggle had two of its eight state controls and no `toggle_on_button` / `toggle_off_button` or button mappings, so it vanished the moment the pointer touched it (hovering landed on an undefined state) and never took a click. Rebuilt against `core_ui_form_components.toggle_base` — the library's own, already proven in game — it works first try.

The rule, which is the same one the button captions turned out to obey:

> A control draws the ONE child its current state names, and nothing else of its own. A state you did not define is a control that disappears.

**Mount (b) — yes.** The same group, unchanged, switches on the compiled chest screen too.

That is the one worth noting. `modifications` have a history here — an insert into an array a definition merely INHERITS creates one that shadows it, which is why the chest is hooked by re-declaring a screen rather than by editing vanilla's. Client-side toggle state crosses that boundary intact.

## Verdict

**Both mounts hold.** `Tabs` is free wherever it is drawn: a tab change is a client-side state change, and neither the pack's own form container nor the modification-inserted chest mount changes that.

The rule for the component:

> A tab's content lives inside its toggle's `checked_control`. Nothing outside observes the state, so nothing has to be told when it changes — which is what makes the whole group cost nothing.
