---
'@bedrock-core/ore-styled': minor
'@bedrock-core/config': minor
---

The addon list shows which row it is showing, and a reset asks before it wipes anything.

- **`MenuRow` takes `selected`.** A selecting list (`chevron={false}`) leaves one row standing after the press, and until now that row looked like every other one — the detail pane was the only thing saying which addon was open. A selected row wears the theme's new `menuRow.textures.backgroundSelected` (the dropdown's own selected-option face, so picking a row and picking an option read the same) through every state: the hover, pressed and locked props are left undefined so `resolveStateBackgrounds`'s `state ?? base` rule fills them from it. The ordinary hover face is LIGHTER than the selection, so leaving it on washed the selection out exactly when the player pointed at it. Defaults to `false` — a navigating list never has a selection.
- **Resetting a scope is confirmed first.** The reset button next to a server / dimension / player row used to patch every setting back to its schema default on the press — the one irreversible action in this UI, one mis-tap away, sitting beside a row whose other press merely opens a screen. It now opens `ConfirmReset`: a native modal naming what is about to be reset, with the destructive action on the `danger` submit and `Back` on the dismiss. The defaults patch is built on confirm, from the schema as it stands then, so a schema that replicated again in between cannot be reset to stale values. Every string is an i18n key (`core.reset.*`, `core.action.reset`), so it translates with the rest of the UI.
