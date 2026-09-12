---
'@bedrock-core/config': minor
'@bedrock-core/ui-compiler': minor
---

An addon's screens follow from what it declared.

`core.register()` is read at build time, and what follows from it is compiled: one config screen per section of the declared schema — shaped for the settings that section has, each drawn as the control it is, with its label baked — and the addon's page in the shared list, drawn from its manifest. A list's items get a screen of their own, with the options a present offers filled in rather than baked.

There is no cap on rows or options, because a screen serving any schema is the only thing that needed one. `configScreens`, `registerConfigScreens` and `registerDeclared` are exported for the module the filter generates; an addon calls none of them.
