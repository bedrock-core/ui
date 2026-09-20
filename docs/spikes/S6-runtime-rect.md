# S6 — does a control re-lay when its size binding changes while open?

**Status: half A answered. Half B PARKED, unmeasured, 2026-08-28.** Blocks runtime layout islands and the chest geometry carrier — both of which stay unbuilt until someone answers it.

> Two client crashes on opening a compiled chest screen, with and without `clips_children`. A binding-driven size under `use_anchored_offset`, inside a collection cell, on the chest — that combination takes the client down. That is itself a finding, and it is a reason to be wary of layout islands even before knowing whether they would re-lay.

## Half A is answered, and not by a spike

`core_ui_common.control` already sizes every cell the interpreter draws from `#size_binding_x` / `#size_binding_y` with `use_anchored_offset`, and has since before compiled screens existed.

**A rect can come from a binding.** That half needs no measuring.

## Half B is the whole question

What that does not show is whether a size **already applied** is recomputed when its source moves. The interpreter never needs it to be: a form is serialized once and cannot change while open, so there has never been anything to observe.

Which also means **half B cannot be asked of a form at all** — a form's data is frozen the moment it is shown. It can only be put to the **chest**, the one screen whose data changes while it is open.

So: a bar sized from the durability of the item in slot 0, stepped by script for two seconds while the screen is up.

## Running it

1. `yarn watch`.
2. **Crimson button** → spawn/open the demo chest.
3. **Mangrove button** while standing at it → steps slot 0's durability for 200 ticks.
4. Watch the white bar along the bottom.

## How to read it

- The bar grows and shrinks → **the engine re-lays a live control.** Layout islands work, and the chest geometry carrier is worth building.
- It takes one width and holds it → **layout is frozen once drawn.** A compiled screen's base must be complete before it is shown, and islands are dead on this host.

## Where it lives

| File | What it is |
| --- | --- |
| `packs/RP/ui/core-ui/spikes/runtime_rect.json` | the bar, and the question in full |
| `packs/RP/ui/core-ui/chest/chrome.json` | one added child, ungated |
| `packs/BP/scripts/spikes/runtimeRect.ts` | steps the durability |

Ungated, like S4(b): the chest has no title to gate on, so the bar draws on every compiled chest screen while the spike is installed.

## Result

_Half B not yet measured. Two harness rounds failed before reaching the question:_

1. **Wrote to the screen's own container, slot 0.** That slot holds the protocol item the chest router gates the entire screen on, so the write did not measure anything — it un-claimed the screen, and the compiled layout was replaced by a plain chest showing the runtime's own marker items. Now reads the player's hotbar, which is published on the same screen and which nothing else on it depends on.
2. **Scaled a raw count as if it were a fraction.** `#item_durability_current_amount` is a count — a diamond pickaxe runs 0..1561 — and the bar multiplied it by 2, so it was roughly 3000px wide for the whole run. A bar that is always off the right edge is indistinguishable from a bar that never moves. Normalized against `#item_durability_total_amount` now.

Round 3 also splits the three ways "the bar did not move" can happen, because only one of them is an answer: a **track** that is always drawn (missing = not mounted), a **numeric readout** of the same value as text (ticking = the binding resolves and updates live), and the **bar** (the same number as a width).

3. **Read durability at all.** Round 3 drew its track — so the spike was mounted and positioned — but the readout never appeared, which says the binding never resolved rather than that the layout never moved. `#item_durability_current_amount` and friends feed vanilla's `progress_bar_renderer`; nothing shows they are readable as plain properties on an arbitrary control, and they are not. Round 4 uses `#inventory_stack_count` with no `binding_condition`, which is exactly how `core_ui_chest.stack_count_label` already pulls a number out of a container collection and renders it.

Confirmed along the way: the script's writes DO land — the vanilla inventory screen showed the durability stepping. The vanilla HUD hotbar does not redraw its own durability live, which is vanilla's business and not this question.

4. **Fed `#size_binding_x` pixels.** Rounds 4–6 drew no bar at all, in any configuration, including on first open with the value already at maximum. The cause was not structure and not the collection:

> **`#size_binding_x` / `#size_binding_y` are FRACTIONS of the control's own declared size, in the range 0..1. They are not pixel widths.**

   A stack of 64 was being written as `179`, on a panel declared `size: [0, 0]`. Zero times an out-of-range fraction is zero, which draws nothing and is indistinguishable from a binding that never resolved. Round 7 declares the panel `["100%", "100%"]` of its cell and writes `#stack / 64.0`.

The lesson, four rounds running: **copy what is already working; do not reason about what ought to.** The fact above is written down in this repo — `core_ui_common.control` carries a `$normalize` variable for exactly this reason — and in the JSON UI knowledge base, and it would have cost one lookup instead of four in-game rounds.

## Verdict

**Parked, and the half that matters is unmeasured.**

Seven rounds. Six were harness faults — writing to the protocol slot, scaling a raw count as a fraction, reading durability bindings that only feed a progress-bar renderer, putting the size bindings on an image instead of a sized panel, and finally feeding pixels to a property that takes a 0–1 fraction. The seventh and eighth crashed the client outright, with and without `clips_children`.

What is known:

- **A rect CAN come from a binding** — the interpreter has done it all along.
- **`#size_binding_x` / `#size_binding_y` are 0–1 fractions of the control's own declared size**, not pixels. A control declared `[0, 0]` can never be sized by them, and an out-of-range value draws nothing rather than clamping. Recorded in `docs/ui/container-screens/findings.md`.
- **The combination crashes the client on a chest screen.** A bound size, `use_anchored_offset`, and a collection cell together took the game down twice. Whatever islands would cost, this is the shape to avoid.

What is not known: **whether the engine re-lays a control whose size binding changes while the screen is open.** Until it is, a compiled screen's base is treated as complete before it is shown, which is what the design already assumes — so nothing is blocked today.

## If someone picks this up

Do not mount it on the chest chrome: a crash there takes out the screen under active development. Build a throwaway screen of its own, and change one thing per round. The harness for this spike is deleted; `git log` has every round.
