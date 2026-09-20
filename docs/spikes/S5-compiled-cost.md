# S5 — is a compiled screen measurably cheaper to open?

**Status: answered 2026-08-28.** Sets the numbers the docs asserted without evidence.

> Interpreted: **14 ms at 50 cells, 53 ms at 200** of server work per open. Compiled: **zero**, by construction — the layout is in the pack and nothing is measured or serialized per present.

## What can and cannot be measured

Be honest about the split — two thirds of this is measurable from script and one third is not.

| | Measurable? | How |
| --- | --- | --- |
| **Server-side cost per open** | yes | time the build+serialize at 50 and 200 cells. This IS the difference: a compiled screen does none of it, so the number is the saving. |
| **Payload size** | yes, but needs an internal export | the serializer is not exported from the package index; a compiled screen's payload is the title alone. |
| **Client-side open latency** | **no** | not readable from script. Open the compiled counter and a 200-cell interpreted screen back to back and say which felt slower, or record it. Do not put a number on this one. |

## Running it

1. `yarn watch`.
2. **Dark oak button** → prints the interpreted server cost at 50 and 200 cells.
3. **Jungle button** → the compiled counter, where that cost is zero by construction.

## Where it lives

`packs/BP/scripts/spikes/perf.ts` — no render pack file; it runs against the screens that already exist.

## Result

| Cells | Interpreted, server work per open | Compiled |
| --- | --- | --- |
| 50 | **14 ms** | 0 |
| 200 | **53 ms** | 0 |

Close to linear — roughly **0.27 ms per cell**, with a small fixed cost on top. At 200 cells the server spends over a tick of its 50 ms budget building one screen for one player, and does it again on every present.

A compiled screen does none of this work at all, so the figures above are the whole saving rather than a difference between two measurements.

## What this does not say

Nothing about the CLIENT. How long the engine takes to draw the result is not readable from script, and no number here should be read as one. The claim that a compiled cell with no decode bindings is cheaper to DRAW remains unmeasured — compare by opening the two back to back, or by recording it.

## Verdict

**The server-side claim holds, with numbers.** A screen of 200 cells costs a tick of server time per open interpreted, and nothing compiled.
