# @bedrock-core/ore-styled

## 0.10.0

### Minor Changes

- [`a6885dc`](https://github.com/bedrock-core/ui/commit/a6885dc6c3ac8971461f086dbc878b65e6fa7fb7) Thanks [@drav0011](https://github.com/drav0011)! - The addon list shows which row it is showing, and a reset asks before it wipes anything.

  - **`MenuRow` takes `selected`.** A selecting list (`chevron={false}`) leaves one row standing after the press, and until now that row looked like every other one — the detail pane was the only thing saying which addon was open. A selected row wears the theme's new `menuRow.textures.backgroundSelected` (the dropdown's own selected-option face, so picking a row and picking an option read the same) through every state: the hover, pressed and locked props are left undefined so `resolveStateBackgrounds`'s `state ?? base` rule fills them from it. The ordinary hover face is LIGHTER than the selection, so leaving it on washed the selection out exactly when the player pointed at it. Defaults to `false` — a navigating list never has a selection.
  - **Resetting a scope is confirmed first.** The reset button next to a server / dimension / player row used to patch every setting back to its schema default on the press — the one irreversible action in this UI, one mis-tap away, sitting beside a row whose other press merely opens a screen. It now opens `ConfirmReset`: a native modal naming what is about to be reset, with the destructive action on the `danger` submit and `Back` on the dismiss. The defaults patch is built on confirm, from the schema as it stands then, so a schema that replicated again in between cannot be reset to stale values. Every string is an i18n key (`core.reset.*`, `core.action.reset`), so it translates with the rest of the UI.

- [`bdf905f`](https://github.com/bedrock-core/ui/commit/bdf905f2b950283589a97f6a101a9df2f646c942) Thanks [@drav0011](https://github.com/drav0011)! - Form field captions are bold, and `fieldLabel` is exported.

  `theme.components.form.labelStyle` gains a **`bold`** token (default `true`), applied as a `§l` prefix alongside the state colour — so a caption out-ranks the description under it without leaning on size. It follows the same literal-vs-key rule as the colour: a caption the resolver knows as a `.lang` key passes through unprefixed, so bold for a localized caption belongs in the authored translation.

  **`fieldLabel(label, enabled)` is now exported** for captions composed outside a `Form.*` wrapper — a checkbox group's own title, for instance, has no control to hang off, and composing it by hand would drift from every other caption the next time the label style moves.

- [`4f84b8d`](https://github.com/bedrock-core/ui/commit/4f84b8d2e8b5933c2eddf1f293b497b913e886cc) Thanks [@drav0011](https://github.com/drav0011)! - The ore-styled `Form.*` fields take texture props, like every other ore-styled component does.

  `Button` has always let a caller's `background` beat the themed one — the theme textures go in first and the rest spreads over them. The `Form.*` fields did the opposite: they `Omit`ed the texture props out of their public type, so re-skinning a single checkbox meant dropping to the runtime primitive and re-deriving the whole theme by hand. They now accept them, with the theme as the FALLBACK rather than the law: `Form.Button` (the four button states), `Form.Checkbox` and `Form.Toggle` (the four unchecked/off states plus `checkedBackground`/`checkedHover`/`checkedLocked`), `Form.Input` (the four field-box states plus the field's `font`/`scale`), `Form.Slider` (track, `progress`/`progressHover`, the four `thumb*` faces and the `trackHeight`/`thumbWidth`/`thumbHeight` geometry that sizes a custom thumb) and `Form.Dropdown` (closed box, `popupBackground`, the option-row faces, and the option/current text styles). Any state left unset still comes from the theme, so nothing about an unstyled field changes.

  Where a field is a wrapper panel plus a native control — a labeled checkbox is a row, a labeled dropdown a column around the panel that pins the chevron — the texture props are destructured out of the layout rest explicitly, so they reach the CONTROL and never the panel; a `background` on a labeled field skins the box, not the strip of row behind the caption. The components' own "no dedicated pressed face, so pressed reuses hover" rule survives an override too: a caller's `backgroundHover` (or `thumbHover`) becomes their pressed face unless they set the pressed one as well.

  `Form.Radio` and `Form.ToggleButton` were inconsistent in a broader way — neither `Omit`ed anything, because neither extended the primitive at all: each declared a closed hand-rolled interface whose only layout props were `flex` and `width`, so nothing else the primitive accepts, appearance or layout, could reach them. Both now extend `Form.InlineSelect`'s props and take the whole appearance set with the theme as the fallback: `optionBackground`/`optionHover`/`optionSelected`, `bullet`/`bulletSelected`/`bulletHover`/`bulletSelectedHover`, `bulletWidth`/`bulletHeight`, `optionFont`/`optionScale`/`optionAlign`, and the group cell's own `background`. Their signature look is part of what the theme supplies rather than an accident of "unset": a radio's row faces default to the EMPTY texture (the bullet carries the visual) and a toggle button's bullets default to the EMPTY texture (the segments carry it), so an untouched group renders exactly as before — set them and it paints. Their ore-shaped props are untouched: `options` collides with nothing (the primitive authors its options as CHILDREN, which is the one omission left on both), and `rowHeight`, `segmentHeight` and the radio's `gap` default of `2` all behave as they did.

  `gap` deserves its own note on those two, because it is a layout prop that must NOT follow the layout rest: it spaces the rows/segments, so it is destructured out with the appearance props and passed to the group. Left to ride the rest, a labeled group would have handed its row spacing to the wrapper column and quietly replaced the caption gap. The toggle button's `gap` is now a knob too, still defaulting to the `-1` overlap that fuses adjacent segment borders.

  `Form.Dropdown` still does not take `children` — the options are built here from the `options` string array, same as the two groups above.

- [`84f38e5`](https://github.com/bedrock-core/ui/commit/84f38e5b8cae507bc92d976e9cad5f9da00c37c1) Thanks [@drav0011](https://github.com/drav0011)! - `MenuRow` and `Header` take the unified text model: titles, subtitles and breadcrumb segments are `DisplayText` (`string | RawMessage`, from `@bedrock-core/i18n`) — a string that resolves as a key localizes client-side, anything else paints literally, and `MenuRow` only auto-colors literal strings. The `TextSource`, `MenuRowText` and `BreadcrumbSegment` unions are removed in its favor.

### Patch Changes

- [`bdf905f`](https://github.com/bedrock-core/ui/commit/bdf905f2b950283589a97f6a101a9df2f646c942) Thanks [@drav0011](https://github.com/drav0011)! - A form field caption that resolves as a `.lang` key is no longer §-prefixed.

  Literal captions carry their state colour as a §-prefix, but that prefix breaks resolution when the string is a translation key — the key stops being recognisable as one and renders raw. `fieldLabel` now asks the active resolver first and passes a known key through untouched, the same rule `MenuRow` already followed. Bake a § code into the authored translation when a localized caption needs a specific colour.

- [`b8b0eb3`](https://github.com/bedrock-core/ui/commit/b8b0eb3280e8f1031e0293bf5a4227f12a1f5640) Thanks [@drav0011](https://github.com/drav0011)! - Fix: the `transparent` Button variant now uses its own hover and pressed textures instead of reusing the default one for every state, so it visibly reacts to input.

- Updated dependencies [[`d0ad2c6`](https://github.com/bedrock-core/ui/commit/d0ad2c695f8b2173875a511b00c7b40f96163799)]:
  - @bedrock-core/i18n@0.1.0
