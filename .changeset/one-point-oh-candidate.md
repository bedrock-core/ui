---
'@bedrock-core/ore-styled': major
'@bedrock-core/ui-compiler': major
---

The compiled UI is a 1.0 candidate, and these three packages reach it together.

`@bedrock-core/ui-runtime` is the API an addon writes against, `@bedrock-core/ui-compiler` is what
turns that into the JSON UI in its pack, and `@bedrock-core/ore-styled` is the control set both
agree on. A screen is drawn from the pack, so the three are one surface in practice: a component
the runtime accepts is only real if the compiler can emit it, and a control only exists at all
because both halves name it the same way. Versioning them apart said otherwise.

`@bedrock-core/ore-styled` is one control per kind, whatever screen draws it. `Button`, `Checkbox`,
`Radio`, `Toggle`, `Input`, `Dropdown`, `Slider`, `ToggleButtonGroup`, `ToggleButtons`, `Card`,
`Divider`, `Header`, `MenuRow`, `Trail` and `Form` are the set, and a control renders the same
whether it was reached from a form, a compiled section or a container screen.

`@bedrock-core/ui-compiler` publishes the compiler surface an addon's build calls: `toIr` and the
IR node types, `emit` and the JSON UI document types, `compileScreen` and `buildRouter` for the
chest host, `compileFormScreen` for the form host, `faceOf` and the face documents, and
`staticTable` / `wantsStatic` for the screens that ship as tables.

Both move to the release-candidate line rather than to 1.0 outright: the surface is what 1.0 will
be, and the candidates are where it is proven against real addons before the number is spent.
