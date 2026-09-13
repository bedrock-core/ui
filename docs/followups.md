# Follow-ups from the docs site

Temporary. Delete items as they land. The docs site has one section per package (`/docs/ui`, `/docs/ore-styled`, `/docs/navigation`, `/docs/flexbox`, `/docs/config`, `/docs/guides`, `/docs/i18n`, `/docs/cli`); `STYLE.md` in the docs repo is the writing standard.

## Comments: history and spike narration

Rewrite as present-tense facts, dropping spike names and dates; the measurements themselves stay in `docs/spikes/`. `ui-compiler` and `ui-runtime` are done; what is left is below.

| Location | Text | Action |
| --- | --- | --- |
| `scripts/bump-meta.mjs:17-21` | "removes the old `MAX_BUMP` clamp" | drop the clause |
| `packages/ui-runtime/scripts/generate-font-metrics.mjs:22` | "clipped the bottom of wrap_box'd headings" | the box height is the measured height and clips children |
| `…/common/label_router.json:1-11`, `…/common/button_router.json:1-9` | "Stage 1 perf shape"; "no longer knows about regions" | the region gate lives in the routers; the base control does not decode regions |
| `…/screens/scroll_pool.json:66,236-240` | "S4 spike"; "SPIKE S5"; "previously collapsed"; "The bet:" | drop tags and the bet; rewrite the rest |
| `…/screens/scroll.json:37` | "worked but this didn't until renamed" | drop the clause |
| `…/common/state.json:96`, `…/components/image.json:25` | "SPIKE S2"; "S2-proven semantics" | drop tags |

Tests:

| Location | Text | Action |
| --- | --- | --- |
| `packages/flexbox/src/__tests__/layout.test.ts:168,803` | "Regression: …"; "The bug was that deriveSize summed" | the invariant |

## JSDoc

- `/** */` on every export; 7 exports in `packages/ui-runtime/src` carry a `//` line instead.
- `ore-styled`: 11 of 28 exports have no JSDoc — the user-facing library, first in line. Then `i18n` (5) and `ui-compiler`, whose count needs retaking since the faces / connectors / nodes split.
- `@example` convention: fenced ```ts or ```tsx, imports from the public package name, `console.warn`, a `Player` parameter, no spike names or dates. Today only `navigation/src/types.ts`, `traversal.ts` and `context.ts` carry one, in three different shapes.
- Add those rules to `.github/copilot-instructions.md`.

## Undocumented exports (docs backlog, needs the code side to be final)

`List`, `Tabs`, `Disclosure`, `Embed` / `EmbedSlots` / `embedMarker`, `ModalContext`, `useObservable`, `withControl`, the error classes, the compiled-screen API (`registerCompiledScreen`, `compiledSnapshotOf`, `compiledTitleOf`, `compiledValuesOf`, `showCompiledTitle`, `FLAG_ON` / `FLAG_OFF`), `Trail`, `fieldLabel`, `NavigationContainer`, `stackReducer`. Mark anything meant to stay internal `@internal` so the docs can skip it.

## Spikes

`docs/spikes/jsonui-container-facts.md` is the former docs-site `findings.md`. The docs repo's `stash@{0}` holds a hunk of new findings for it; the apply command is in `docs/PLAN.md` there.

## READMEs

At 1.0, each package README becomes one paragraph, the install line, one example and a link to its docs section.
