---
'@bedrock-core/ore-styled': minor
'@bedrock-core/ui-compiler': minor
---

These three packages are one surface, and they move together.

`@bedrock-core/ui-runtime` is the API an addon writes against, `@bedrock-core/ui-compiler` is what
turns that into the JSON UI in its pack, and `@bedrock-core/ore-styled` is the control set both
agree on. A screen is drawn from the pack, so the three are one surface in practice: a component
the runtime accepts is only real if the compiler can emit it, and a control only exists at all
because both halves name it the same way. Versioning them apart said otherwise.

`@bedrock-core/ore-styled` is one control per kind, whatever screen draws it. `Button`, `Checkbox`,
`Radio`, `Toggle`, `Input`, `Dropdown`, `Slider`, `ToggleButtons`, `Tabs`, `Card`, `Divider`, `Header`,
`MenuRow`, `Trail` and `Form` are the set, and a control renders the same whether it was reached
from a form, a compiled section or a container screen. `ToggleButtons` makes one choice, or any
number with `multiple`, and looks the same either way: a chosen segment wears the pressed face, a
white label and a one-pixel drop on every host. `Tabs` takes a label per `Tabs.Tab` and draws its
headers on the theme's `tabs` faces, which started as copies of the toggle buttons'.

`@bedrock-core/ui-compiler` publishes the compiler surface an addon's build calls: `toIr` and the
IR node types, `emit` and the JSON UI document types, `compileScreen` and `buildRouter` for the
chest host, `compileFormScreen` for the form host, and `faceOf` and the face documents.
