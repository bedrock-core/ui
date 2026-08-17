# @bedrock-core/config

The shared **addon list + config + guide UI** for [`@bedrock-core/ui`](https://github.com/bedrock-core/ui).
Every registered addon mounts it with one line; one realm serves the UI for all of them, because the
registry, config schemas, guides, and translation keys replicate over sync.

```ts
import { core } from '@bedrock-core/server-runtime';
import { ui } from '@bedrock-core/config';

core.register({ creator: 'bt', pack: 'gc_graves', /* ...translations, guide, config... */ });
ui(core);             // registers bt_gc_graves:config, :configat, :guide, :list
```

`ui(core)` registers this addon's commands **under its own namespace** and serves the open RPC,
so whichever realm runs the newest runtime renders the UI for every addon. This package depends
on `@bedrock-core/server-runtime` for **types only** — no value import, so the two build and
version independently.

## Layout

| Path | What lives there |
| --- | --- |
| `mount.tsx` | `ui()`, command dispatch, and the host-side open funnel — start here |
| `App.tsx` | the root screen component: owns the `NavigationContainer` and the context providers |
| `commands/` | `addon.ts` (every command), `lists.ts`, `origin.ts`, `parse.ts`, `targets.ts` |
| `navigation/` | a fired command → a route stack: `openTarget.ts` → `initialState.ts`, `routes.ts`, `openConfig.ts` |
| `config/` | the config domain: `schema.ts` shaping, `values.ts` transport, `nested.ts` paths |
| `permissions.ts` | who may reach which scope — the caller-side half of authorization |
| `context.ts` | `useCore` / `usePlayer`, provided once by `App` |
| `i18n/` | this package's own strings (`en_US.ts`), folded into your bundle under the `core` namespace |
| `frameworkGuide.ts` | the built-in bedrock-core guide served alongside each addon's own |
| `types.ts` | `CONFIG_SCOPES`, `ConfigScope`, `EntrySchema`, `FlatSchemaLike` |
| `screens/` | the screens themselves |

## Commands

Every command lives under the addon's own namespace — `core.id`, e.g. `bt_gc_graves`. There is
no shared `core:*` surface.

| Command | Who | What |
| --- | --- | --- |
| `<ns>:config` | anyone | open this addon's config UI |
| `<ns>:config get <setting>` | anyone | read one of your own settings |
| `<ns>:config set <setting> <value>` | anyone | change one of your own settings |
| `<ns>:config add\|remove <setting> <item>` | anyone | add to / remove from one of your own **list** settings |
| `<ns>:configat get <scope.setting> [target]` | operator | read any setting |
| `<ns>:configat set <scope.setting> <value> [target]` | operator | change any setting |
| `<ns>:configat add\|remove <scope.setting> <item> [target]` | operator | add to / remove from any **list** setting |
| `<ns>:guide` | anyone | this addon's guide, with the list under it |
| `<ns>:list` | anyone | the addon list, with this addon selected |

The verb and both setting enums are generated from the config schema, so `get`, `set`, `add`,
`remove` and every setting autocomplete — `list` entries included. A list has no form control (a
modal's only buttons are its submit and its dismiss), so chat is the only place it can be edited:
`get` prints the items and the count against `maxItems`, `set` replaces the whole list from one
comma-separated argument, and `add` / `remove` change a single item. The config screen shows each
list with its current value and the command that changes it.

**The scope rides in the setting** (`server.pricing.tax_rate`), not as its own argument. A
parameter list is flat and positional with no branching, so a separate scope token would push the
setting to position 3 or 4 depending on whether that scope takes a target — and a setting that
moves cannot be an `Enum`. Prefixing pins it, which is what keeps autocomplete. Arity is
dispatched on the verb: for `get` the next argument is the target, for `set`, `add` and `remove`
it is the value or item and the one after is the target.

**Two commands, not one,** because one command means one enum and one permission level.
`:config` is `Any` and its enum holds only your own player-scope settings; `:configat` is `Admin`,
which is what keeps it out of a non-operator's autocomplete entirely. `cheatsRequired` is `false`
throughout — opening a config screen is not a cheat, and authority comes from the permission
level instead.

`target` is a plain string (a player name or a dimension id). It cannot be a `PlayerSelector`:
one parameter has to serve both scopes, and optional parameters can only be omitted from the
right, so a second one could never be reached.

**Unqualified aliases.** Bedrock gives the first pack to register a name an alias without the
namespace — the first `x:guide` in a world also answers to plain `/guide`, and later packs are
told to use their full name. There is no way to opt out (`CustomCommand` has no alias field) and
no way to detect it (`CustomCommandOrigin` carries no command name), so `/guide` means one
arbitrary addon's guide and the callback cannot tell. Every description therefore leads with the
namespace, so the command list reads `bt_gc_economy - open this addon's in-game guide` and the
player can see which addon they are about to reach.

**Why per-addon and not shared.** Bedrock permits a pack exactly one command-enum namespace and
forbids two packs from sharing one. A shared `core:*` surface would hand that namespace to
whichever realm registered first, lock every other addon out of enums, and freeze that realm's
command names and parameter lists for the life of the world. Per-addon namespaces mean nothing
is contended, nothing is elected, and updating an addon updates its commands.

Turn them off with `ui(core, { commands: false })` — that leaves the addon with no commands at
all, since there is no shared surface to fall back on.

## Permissions

Non-operators reach their **own player scope only**. This is enforced twice, on purpose:

- **Caller side** — `clampTarget` narrows a deep link before the first render, the scope pickers
  hide what a player may not open, and `:config get`/`set` reach only the runner's own scope.
- **Owner side** — every read and write made on a player's behalf carries an `actorId` the owning
  addon checks (`authorization.ts` in `@bedrock-core/server-runtime`), so a realm that skipped the
  caller-side rule still cannot write.

Operator status is read from `playerPermissionLevel`, never `commandPermissionLevel` — the latter is
writable by any script in the world.

## API

- `ui(core, options?)` — mount the shared config UI on a runtime. Call once, after `core.register()`.
- `App({ core, player, target, values? })` — the root screen component, exported for custom mounts;
  owns its `NavigationContainer` and stacks the list / config / guide screens.
- `registerAddonCommands(core, onOpen)` — this addon's commands on their own, for a custom mount.
- `isOperator(player)` / `allowedScopes(player)` / `clampTarget(target, player)` — the permission rule.
- `CONFIG_SCOPES` — the three layers a setting can live at (`server`, `dimension`, `player`), with
  the `ConfigScope`, `EntrySchema` and `FlatSchemaLike` types, for code that builds its own pickers.

## Screens

| Route | Screen |
| --- | --- |
| `List` | every registered addon; entry point |
| `ConfigScope` | pick world / dimension / player scope for an addon |
| `EntityList` | pick a dimension or player to configure |
| `Config` | the addon's config fields for the chosen scope, plus its read-only list summary |
| `ConfirmReset` | confirm before putting a scope back to its schema defaults |
| `Guide` | the addon's self-contained guide (via `@bedrock-core/guides` `createGuide`) |

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
