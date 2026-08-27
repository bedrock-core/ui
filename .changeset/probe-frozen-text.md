---
'@bedrock-core/ui-runtime': minor
'@bedrock-core/ui-compile': minor
---

The build now catches text that a container screen would silently freeze.

A compiled screen's text is written into JSON UI at build time, so a `<Text>` whose content comes from state showed the build's string forever and said nothing about it — a screen that looks right in every screenshot and is wrong the moment anything happens. `maxLength` is what reserves the container slots a changing string needs, and forgetting it had no symptom.

The compiler now renders a screen once for the reference, then again with each `useState` / `useReducer` slot perturbed, and fails the build on what moved:

```
"furnace" has 1 <Text> that changes with state but is baked into the layout.
  Baked text is written into JSON UI at build time and never changes again, so the
  screen would show the build's string forever. Give each one `maxLength`, which
  reserves a container slot per character:
    "smelted 0" became "smelted 1" — needs maxLength={9} or more
```

The same pass rejects a state change that adds, drops or reorders a cell — a compiled screen is numbered once, so its shape cannot move between renders.

Two things are deliberately not reported: text that already declares `maxLength` (it reserved its cells), and a `<Button>`'s children, which are its face and are baked by definition — an ore-styled button colours its caption by `enabled`, and on a compiled screen only the background swaps.

Probing is not proof: a value that changes only past a threshold no probe crosses is still missed, so `maxLength` remains an explicit marker rather than a hint. Nothing it reports is a false alarm, though — every finding really did change between two renders of the same screen.
