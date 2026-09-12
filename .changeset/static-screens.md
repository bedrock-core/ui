---
'@bedrock-core/ui-runtime': minor
'@bedrock-core/ui-compile': minor
'@bedrock-core/guides': major
---

A screen that cannot change ships as a table, not as a component.

A screen is STATIC when every string it shows is baked and every press it takes is a `<Link>`.
Nothing about it can differ between one present and the next, so the build already knows the
whole of what showing it requires — the title, the value each entry carries, and where each press
leads — and the addon ships that instead of the code that would recompute it.

A guide was what this cost the most. Its pages were data in the pack, its views were code in the
bundle, and every open rebuilt the page's whole block tree to reproduce a layout that had been
baked into the resource pack at build time. Now a guide page is a row: `GuideBlockList`,
`GuidePageView`, `GuideHomeView` and the guide manifest are all absent from a built addon, and
opening a page is one form call.

`<Screen static>` asserts it. The build proves the screen really is static and fails with what
stopped it otherwise — a live value, or a press it cannot describe — so a screen that was meant to
cost nothing cannot quietly start costing something. Screens that qualify are detected either way;
the marker is for the ones where it matters.

New in `@bedrock-core/ui-runtime`: `registerStaticScreens`, `staticScreen`, `staticScreens`, and
`navigate()` showing a static screen straight from its table. `addonReference(ns)` returns what the
build baked rather than walking components at startup, and `screenReference()` is gone with the
walk. `@bedrock-core/ui-compile` exports `staticTable` and `wantsStatic`, and a compiled screen
carries `table` when it is one.

In `@bedrock-core/guides`, `openGuide(ns, player)` no longer takes the manifest: it navigates to
the guide's index key, and the manifest is build input that never reaches the addon. A `cmp` block
in a guide may not take a press — somewhere to go is a `<Link>`, anything else is decoration.

`@bedrock-core/config` gains `list_item_text` and `list_item_choice`: a list's item is edited on a
generic screen when the owner's shaped one is not in this bundle, which is the case on every realm
that draws another addon's config.
