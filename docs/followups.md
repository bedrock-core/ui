# Follow-ups from the docs site

Temporary. Delete items as they land. The docs site has one section per package (`/docs/ui`, `/docs/ore-styled`, `/docs/navigation`, `/docs/flexbox`, `/docs/config`, `/docs/guides`, `/docs/i18n`, `/docs/cli`); `STYLE.md` in the docs repo is the writing standard.

## Comments: history and spike narration

Rewrite as present-tense facts. Spike references become a link to the checked-in page under `docs/spikes/` or just the number, the way `server-public/packages/db/src/collection.ts` does it.

| Location | Text | Action |
| --- | --- | --- |
| `packages/config/src/i18n/en_US.ts:1-14` | "used to hardcode these in English … Now it goes through" | strings are keyed under the `core` namespace and published when the UI mounts |
| `packages/config/src/screens/ConfirmReset.tsx:15` | "used to patch on the press" | a confirmation step in front of the one irreversible action |
| `packages/config/src/screens/ConfigList.tsx:23,30` | "which is why it used to be"; "there was no gesture left" | rewrite 23; drop 30 |
| `packages/config/src/commands/lists.ts:1-16` | "used to be left out of the command enum" | chat is the only place a list is edited |
| `packages/config/src/commands/parse.ts:20` | "Lists used to be filtered out here" | every declared key is offered; `add` / `remove` / comma `set` are the list spellings |
| `packages/ui-runtime/src/core/ir/validate.ts:21-37` | "There used to be a validator per backend" | drop the paragraph; keep "a need says why" |
| `packages/ui-runtime/src/components/Tabs.ts:8,15,30` | "MEASURED (spike S4)"; "which S5 priced at"; "for now" | facts; drop spike names and "for now" |
| `packages/ui-compile/src/nodes/tabs.ts:9,14` | "MEASURED (spike S4)"; "learned by getting them wrong first" | rewrite; drop the clause |
| `packages/ui-compile/src/jsonui.ts:195` | "measured the hard way in spike S4" | a toggle draws the one child its state names; define all eight |
| `packages/ui-compile/src/hosts/form/emit.ts:26` | "MEASURED (spike S1)" | engine fact |
| `packages/ui-runtime/src/hosts/form/contract.ts:47` | "MEASURED 2026-08-27 (spike S1)" | drop date and spike |
| `packages/ui-compile/src/hosts/chest.ts:103` | "for now — nothing else, because every node kind's mechanism was" | each node kind's mechanism lives in its own module |
| `packages/ui-compile/src/hosts/form/compile.ts:180` | "no longer match the bake" | "do not match the bake" |
| `packages/ui-compile/src/__fixtures__/demo.ts:35` | "the document no longer carries it" | "does not carry it" |
| `scripts/bump-meta.mjs:17-21` | "removes the old `MAX_BUMP` clamp" | drop the clause |
| `packages/ui-runtime/scripts/generate-font-metrics.mjs:22` | "clipped the bottom of wrap_box'd headings" | the box height is the measured height and clips children |
| `packages/resource-pack/packs/RP/ui/core-ui/common/control.json:3-39` | "Stage 1, in-game proven by the S1/S2 spikes"; "S1-verified"; "S2-verified"; "moved UP"; "no longer decodes"; "the old copy/paste didn't" | present tense; drop verification tags |
| `…/common/label_router.json:1-11`, `…/common/button_router.json:1-9` | "Stage 1 perf shape"; "no longer knows about regions" | the region gate lives in the routers; the base control does not decode regions |
| `…/screens/scroll_pool.json:66,236-240` | "S4 spike"; "SPIKE S5"; "previously collapsed"; "The bet:" | drop tags and the bet; rewrite the rest |
| `…/screens/scroll.json:37` | "worked but this didn't until renamed" | drop the clause |
| `…/common/state.json:96`, `…/components/image.json:25` | "SPIKE S2"; "S2-proven semantics" | drop tags |

Tests:

| Location | Text | Action |
| --- | --- | --- |
| `packages/flexbox/src/__tests__/layout.test.ts:168,803` | "Regression: …"; "The bug was that deriveSize summed" | the invariant |
| `packages/ui-compile/src/__tests__/emit.test.ts:659` | "The bug the rule was found by" | a single placed slot must be gated like a grid |
| `packages/ui-compile/src/__tests__/tabs.test.ts:49` | "Measured in S4:" | drop the tag |
| `packages/ui-runtime/src/core/__tests__/commonFontSlot.test.ts:87,141` | "The exact regression"; "Used to throw SerializationError" | rewrite 87; drop 141 |
| `packages/ui-runtime/src/core/__tests__/modalForm.test.ts:551` | "block that used to precede it" | rewrite |
| `packages/ui-runtime/src/core/render/__tests__/lifecycle.swap.test.ts:135` | "THE regression:" | drop the label |
| `packages/ui-compile/src/hosts/form/__tests__/modal.test.ts:32` | test name "which an unlowered field used to prevent" | "compiles a lowered field" |
| `packages/config/src/config/__tests__/schema.test.ts:191` | "forced the old read-only fallback" | rewrite |

## JSDoc

- `/** */` on every export; 7 exports in `packages/ui-runtime/src` carry a `//` line instead.
- `ore-styled`: 11 of 28 exports have no JSDoc — the user-facing library, first in line. Then `i18n` (5), `ui-compile` (25).
- `@example` convention: fenced ```ts or ```tsx, imports from the public package name, `console.warn`, a `Player` parameter, no spike names or dates. Today only `navigation/src/types.ts`, `traversal.ts` and `context.ts` carry one, in three different shapes.
- Add those rules to `.github/copilot-instructions.md`.

## Undocumented exports (docs backlog, needs the code side to be final)

`List`, `Tabs`, `Disclosure`, `Embed` / `EmbedSlots` / `embedMarker`, `ModalContext`, `useObservable`, `withControl`, the error classes, the compiled-screen API (`registerCompiledScreen`, `compiledSnapshotOf`, `compiledTitleOf`, `compiledValuesOf`, `showCompiledTitle`, `FLAG_ON` / `FLAG_OFF`), `Trail`, `fieldLabel`, `NavigationContainer`, `stackReducer`. Mark anything meant to stay internal `@internal` so the docs can skip it.

## Spikes

`docs/spikes/jsonui-container-facts.md` is the former docs-site `findings.md`. The docs repo's `stash@{0}` holds a hunk of new findings for it; the apply command is in `docs/PLAN.md` there.

## READMEs

At 1.0, each package README becomes one paragraph, the install line, one example and a link to its docs section.
