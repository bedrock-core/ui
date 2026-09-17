---
'@bedrock-core/ui-runtime': minor
'@bedrock-core/ui-compiler': minor
'@bedrock-core/navigation': minor
---

A `<Link params>` opens its target with those params from a static screen and across realms, not only from a screen rendered at runtime.

A static screen's table carries each link's params beside its key: `ReferenceTarget` is `{ to, params?, replace? }`, and a walk that reaches a key the table does not describe — a screen with handlers of its own, or one only its owner's realm can draw — navigates to it with them. A screen the table does describe is shown from values baked with no props, so it takes none.

Params that leave a bundle are plain data: strings, finite numbers, booleans, null, and arrays and plain objects of those. A link whose params hold anything else — a function, a class instance, `undefined`, `NaN` — keeps its screen's component, and a screen declared `<Screen static>` fails the build naming the part that is not data. `whyNotPlainData(value, path)` is that check.

`@bedrock-core/navigation` hands a screen to its owning realm with its params: `CrossRealm.ask` takes them and a `screen` target carries them as `params`. Params that are not plain data stay behind with a warning, and the screen opens without them.
