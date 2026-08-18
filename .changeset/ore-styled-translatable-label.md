---
'@bedrock-core/ore-styled': patch
---

A form field caption that resolves as a `.lang` key is no longer §-prefixed.

Literal captions carry their state colour as a §-prefix, but that prefix breaks resolution when the string is a translation key — the key stops being recognisable as one and renders raw. `fieldLabel` now asks the active resolver first and passes a known key through untouched, the same rule `MenuRow` already followed. Bake a § code into the authored translation when a localized caption needs a specific colour.
