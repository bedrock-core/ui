---
'@bedrock-core/ore-styled': minor
---

Form field captions are bold, and `fieldLabel` is exported.

`theme.components.form.labelStyle` gains a **`bold`** token (default `true`), applied as a `§l` prefix alongside the state colour — so a caption out-ranks the description under it without leaning on size. It follows the same literal-vs-key rule as the colour: a caption the resolver knows as a `.lang` key passes through unprefixed, so bold for a localized caption belongs in the authored translation.

**`fieldLabel(label, enabled)` is now exported** for captions composed outside a `Form.*` wrapper — a checkbox group's own title, for instance, has no control to hang off, and composing it by hand would drift from every other caption the next time the label style moves.
