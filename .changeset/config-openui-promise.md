---
'@bedrock-core/config': minor
---

`openUi` now returns `Promise<void>` (settles once the screen is handed to the renderer).

Return it from a ui-runtime presser — `onPress={() => openUi(core, player, target)}` — so the handoff lands inside the interactive transaction: deterministic, flash-free, and no `exit()` needed. Fire-and-forget call sites keep working; prefix them with `void` to satisfy no-floating-promises lint rules.
