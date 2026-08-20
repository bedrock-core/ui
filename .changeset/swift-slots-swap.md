---
'@bedrock-core/ui-runtime': patch
---

`render()` during a live session now swaps the new app into the existing present loop — one UI slot per player — instead of spawning a competing loop.

Fixes the cross-app handoff race (app A's button opens app B): depending on microtask ordering, A's exit verdict could tear down B's freshly-rendered session, leaving a zombie form whose first press was swallowed. Now any ordering converges:

- The old app's fibers are cleaned up at swap time, so a dead `exit()` fiber can never poison the next verdict, hook state can never bleed between same-named roots, and background logic passes are never blocked by a stale exit flag.
- A programmatic close during a handoff is no longer treated as ESC: the surviving loop absorbs the swap and presents the new app (a modal's `onCancel` is skipped — the player didn't dismiss).
- Present chains carry a token, so a superseded chain's late outcome is void instead of tearing down its successor.
- A crashed build or a rejected `show()` (player quit) now tears the session down instead of stranding the player input-locked.

From a presser, handing off is now simply `onPress={() => openUi(...)}` (return the promise) — no `exit()` needed, no flash.
