# @bedrock-core/config

## 0.2.0

### Minor Changes

- [`c879bfc`](https://github.com/bedrock-core/ui/commit/c879bfcae06704047e052146601e25267f9747d5) Thanks [@drav0011](https://github.com/drav0011)! - `openUi` now returns `Promise<void>` (settles once the screen is handed to the renderer).

  Return it from a ui-runtime presser — `onPress={() => openUi(core, player, target)}` — so the handoff lands inside the interactive transaction: deterministic, flash-free, and no `exit()` needed. Fire-and-forget call sites keep working; prefix them with `void` to satisfy no-floating-promises lint rules.

## 0.1.0

### Minor Changes

- [`8791ec3`](https://github.com/bedrock-core/ui/commit/8791ec37b51a339dca158d8644249cd388d9ad87) Thanks [@drav0011](https://github.com/drav0011)! - Initial release.

  The shared addon list + config + guide UI. Every bedrock-core addon mounts it with one line, and whichever realm runs the newest runtime renders it for all of them — the registry, config schemas, guides and translation keys all replicate over sync:

  ```ts
  import { core } from "@bedrock-core/server-runtime";
  import { ui } from "@bedrock-core/config";

  core.register({
    creator: "bt",
    pack: "gc_graves" /* ...translations, guide, config... */,
  });
  ui(core);
  ```

  ## Commands

  Every command lives under the addon's own namespace (`core.id`, e.g. `bt_gc_graves`). There is no shared surface: Bedrock permits a pack exactly one command-enum namespace and forbids two packs from sharing one, so a shared one would hand that namespace to whichever realm registered first, lock every other addon out of enums, and freeze that realm's command names for the life of the world.

  | Command                                              | Who      | What                                       |
  | ---------------------------------------------------- | -------- | ------------------------------------------ |
  | `<ns>:config`                                        | anyone   | open this addon's config UI                |
  | `<ns>:config get <setting>`                          | anyone   | read one of your own settings              |
  | `<ns>:config set <setting> <value>`                  | anyone   | change one of your own settings            |
  | `<ns>:configat get <scope.setting> [target]`         | operator | read any setting                           |
  | `<ns>:configat set <scope.setting> <value> [target]` | operator | change any setting                         |
  | `<ns>:guide`                                         | anyone   | this addon's guide, with the list under it |
  | `<ns>:list`                                          | anyone   | the addon list, with this addon selected   |

  The verb and both setting enums are generated from the addon's config schema, so `get`/`set` and every setting autocomplete. The scope rides in the setting (`server.pricing.tax_rate`) rather than as its own argument: a parameter list is flat and positional with no branching, so a separate scope token would push the setting to position 3 or 4 depending on whether that scope takes a target, and a setting that moves cannot be an `Enum`. Arity is dispatched on the verb instead.

  Two commands rather than one, because one command means one enum and one permission level: `:config` is `Any` and its enum holds only the runner's own player-scope settings, while `:configat` is `Admin`, which keeps it out of a non-operator's autocomplete entirely. Everything is `cheatsRequired: false`; authority comes from the permission level. Opt out with `ui(core, { commands: false })`.

  ## Permissions

  Non-operators reach their own player scope only, enforced on both sides. Caller side: `clampTarget` narrows a request before the first render, the List's Config button goes straight to their own settings rather than a picker with one usable row, and the scope screens never enter their stack. Owner side: every read and write carries the viewing player as `actorId`, which the owning addon checks independently — covering a realm that fell back to an older copy of this UI. Operator status is read from the readonly `playerPermissionLevel`, never the script-writable `commandPermissionLevel`.

  ## Details

  - A request that names a scope fetches that scope's values before mounting, so it opens showing what is actually set rather than every field at its schema default — `Config` presents a native modal and cannot fetch its own without presenting twice.
  - bedrock-core has its own built-in guide covering the commands: the framework has a row in the list but no realm behind it, so nothing can publish one on its behalf. Its prose — and every UI string in this package — is typed i18n resources (`core.*` keys, `src/i18n/en_US.ts`): the i18n Regolith filter folds them into every consuming realm's bundle and generated `.lang`, so they paint, measure and translate exactly like an addon's own keys, addon overrides included. The UI's measurement source is one call: `core.translations.forPlayer(player)`.
  - A screen opened for an addon whose config or guide has not replicated yet returns to the list with that addon selected, rather than showing a dead end.
  - A rejected command registration names the addon's namespace and points at `core.id`, because Bedrock's own error names only the namespace that won.
  - Every command description leads with the namespace. Bedrock gives the first pack to register a name an unqualified alias for it, with no way to opt out and no way to detect it in the callback, so plain `/guide` reaches one arbitrary addon — the description is what tells the player which.
  - `@bedrock-core/server-runtime` is a **types-only** dependency — no value import, so the two build and version independently.

- [`947b82d`](https://github.com/bedrock-core/ui/commit/947b82d105856562f9dbe16c7b4b5ba32346e803) Thanks [@drav0011](https://github.com/drav0011)! - List settings are reachable: four command verbs, and the config screen names every list it cannot edit.

  **Breaking for anyone reading the enums.** `<ns>:verb` now holds `get`, `set`, `add`, `remove`, and both setting enums hold every key the schema declares — `list` entries included.

  A `list` was the one entry type nothing could touch from outside code. It has no native modal control, and a modal form's only buttons are its submit and its dismiss, so there is no third control to route an editor screen from; it was excluded from the command enums as well, on the reasoning that a list has no single-value spelling and offering the key could only fail on submit. Between the two, a setting an addon deliberately exposed was invisible to the player who owned it. Chat is the only surface left, so chat is where the spelling was added:

  ```text
  /<ns>:config get moderation.bannedItems
  moderation.bannedItems = [tnt, lava_bucket] (2/50)

  /<ns>:config set moderation.bannedItems tnt, lava_bucket, bedrock
  /<ns>:config add moderation.bannedItems flint_and_steel
  /<ns>:config remove moderation.bannedItems tnt
  ```

  `add` and `remove` exist because `set` alone would mean retyping the whole list to change one entry, and getting one item wrong silently drops it. `get` brackets the items and appends `(count/maxItems)` when the schema caps the list, with `(empty)` for an empty one — `[]` reads as much like a screen that failed to render as like a setting with nothing in it. `set` splits on commas and trims each item, so `set <key> ""` is how a list is cleared.

  Everything is refused rather than quietly accepted: adding an item already present, adding past `maxItems`, removing an item that is not there, setting more items than `maxItems` or naming one twice, and — for `itemType: 'enum'` — any item outside `options`, whose failure lists every value that would have worked, since the enum autocompletes the _setting_ and never the item. `add` and `remove` pointed at a non-list key say so and name it; `get` and `set` on a non-list key behave exactly as they always have. All four verbs work on `:configat` too, with the same arity rule the old two had: the item comes first, the target after it.

  A list is stored as one flat key holding its array's JSON, which is what the runtime's own flattening produces, so a command patches it exactly like a scalar — through the same `system.run()` deferral, because a dynamic-property write cannot happen inside a command callback.

  **The config screen shows lists instead of apologizing for them.** It used to print one muted line saying list settings were code-only, naming none of them. Each list field now gets its label, its description, its current items against `maxItems`, and the command that changes it — spelled for whoever is looking: `:config` when a player is on their own player scope, `:configat` with the scope inside the key otherwise. A scope holding _only_ lists used to be a dead end with a sentence in the middle of it; it now shows the same block in a scrollable card, since a form with no fields is not a form.

  Every new string is an i18n resource (`core.command.list.*`, `core.config.lists.*`) and command replies resolve through the world-published bundle in the runner's own language, which is the first command output in this package that does. The older parse and permission messages are still hardcoded English. The framework's built-in guide covers the two new verbs. The deleted `list:` resources and the `config.listOnly` / `config.unknownList` / `config.listsElsewhere` keys went with the list screen that used them.

- [`3d23691`](https://github.com/bedrock-core/ui/commit/3d236912e5e449326476a74cf68d6b48303293fe) Thanks [@drav0011](https://github.com/drav0011)! - Nested config sections: named, navigable, and unbounded in depth.

  A schema group can now name itself with `$label` and `$description`, and the config UI renders the tree as authored rather than collapsing everything below the first dot:

  ```ts
  server: {
    economy: {
      $label: 'Economy',
      $description: 'Money, prices and tax.',
      pricing: {
        $label: 'Pricing',
        taxRate: { type: 'number', default: 5, min: 0, max: 100, label: 'Tax Rate' },
      },
    },
  }
  ```

  **A level that holds only sub-sections becomes a screen of buttons; a level that holds settings is the form.** That split is forced by the platform — a native modal's only controls are its submit and its dismiss, so a form has no way to offer "open this sub-section". Any groups nested _under_ a form still render inline, indented per level.

  Requires `@bedrock-core/server-runtime` with the `core-config/groups` state key to show declared names. Against an older runtime the group map is empty and sections fall back to the key-derived titles they always used, so nothing breaks — it just stays unnamed.

  **Lists are editable in the UI now.** A list has no native modal control, so it used to be read-only everywhere with only a chat command to change it. It no longer counts as "forces a form" — a level holding only lists and sub-sections is a button screen, and each list gets a row that opens a real editor (items as rows, press to remove, add via a native text field or a dropdown of the unused options, `maxItems` respected). A list stranded on a level that _does_ have fields still falls back to naming its command, because there is genuinely no button to give it there.

  **New `multiselect` entry type** — any number of a fixed option set, drawn as one checkbox per option inside the modal and stored as the array's JSON, exactly like a list:

  ```ts
  features: { type: 'multiselect', options: ['pvp', 'tp', 'shop'], default: ['pvp'], label: 'Enabled Features' },
  ```

  **Enums with 5 options or fewer render as inline toggle-button segments** instead of a dropdown — every choice visible, one press to change. Past 5 the segments get too narrow to read and it falls back to the dropdown.

  Type pass: field captions are `scale: 0.9` and bold, descriptions `scale: 0.8` and muted, a heavier rule between properties and a light one under each section title. The caption change lives in `theme.components.form.labelStyle` (new `bold` token), so it applies to every ore-styled form, not just config. `fieldLabel` is now exported from `@bedrock-core/ore-styled` for captions composed outside a `Form.*` wrapper.

  **The `Config` route now requires a `path` param** (`''` for a whole scope). `openConfig` still works; new code should call `openScopeRoot`, which picks buttons-or-form for you.

- [`a6885dc`](https://github.com/bedrock-core/ui/commit/a6885dc6c3ac8971461f086dbc878b65e6fa7fb7) Thanks [@drav0011](https://github.com/drav0011)! - The addon list shows which row it is showing, and a reset asks before it wipes anything.

  - **`MenuRow` takes `selected`.** A selecting list (`chevron={false}`) leaves one row standing after the press, and until now that row looked like every other one — the detail pane was the only thing saying which addon was open. A selected row wears the theme's new `menuRow.textures.backgroundSelected` (the dropdown's own selected-option face, so picking a row and picking an option read the same) through every state: the hover, pressed and locked props are left undefined so `resolveStateBackgrounds`'s `state ?? base` rule fills them from it. The ordinary hover face is LIGHTER than the selection, so leaving it on washed the selection out exactly when the player pointed at it. Defaults to `false` — a navigating list never has a selection.
  - **Resetting a scope is confirmed first.** The reset button next to a server / dimension / player row used to patch every setting back to its schema default on the press — the one irreversible action in this UI, one mis-tap away, sitting beside a row whose other press merely opens a screen. It now opens `ConfirmReset`: a native modal naming what is about to be reset, with the destructive action on the `danger` submit and `Back` on the dismiss. The defaults patch is built on confirm, from the schema as it stands then, so a schema that replicated again in between cannot be reset to stale values. Every string is an i18n key (`core.reset.*`, `core.action.reset`), so it translates with the rest of the UI.

- [`79660f8`](https://github.com/bedrock-core/ui/commit/79660f8726e480ab35c31da7adfe578998e29ab6) Thanks [@drav0011](https://github.com/drav0011)! - Operator-only guide pages.

  Author a page — or a whole `_category_.json` — with `access: op` and it is compiled for operators only. Access inherits downward and is never widened by a child, so the manifest carries the effective value on every page and sidebar node.

  ```tsx
  const audience = isOperator(player) ? "op" : "player";
  const Guide = createGuide(guides, { title: "My Addon", audience });
  ```

  For a `'player'`, gated pages and categories leave the sidebar (a category that empties out goes with them), prev/next follows a chain baked without them, the landing page is resolved over what they can see, and an inline link to a gated page renders as prose. `hasVisiblePages(manifest, audience)` says whether there is anything in there for them at all.

  Build the component **per audience** and key any cache by audience as well as by addon — the landing page and sidebar are decided when the component is built.

  Gating is presentation, not protection: manifests replicate world-wide and the prose ships in the pack's `.lang`, so it decides what a player is shown, not what they may do.

  `@bedrock-core/config` applies it end to end: the list's Guide button greys out when there is nothing to read, and `clampTarget` sends a `:guide` command to the addon list instead of an empty index. **`clampTarget(target, player)` now takes a third argument, `core`.**

  A guide with nothing gated compiles byte-identically to before.
