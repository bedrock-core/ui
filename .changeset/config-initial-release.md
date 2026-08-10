---
'@bedrock-core/config': minor
---

Initial release.

The shared addon list + config + guide UI. Every bedrock-core addon mounts it with one line, and whichever realm runs the newest runtime renders it for all of them — the registry, config schemas, guides and translation keys all replicate over sync:

```ts
import { core } from '@bedrock-core/server-runtime';
import { ui } from '@bedrock-core/config';

core.register({ creator: 'bt', pack: 'gc_graves', /* ...translations, guide, config... */ });
ui(core);
```

## Commands

Every command lives under the addon's own namespace (`core.id`, e.g. `bt_gc_graves`). There is no shared surface: Bedrock permits a pack exactly one command-enum namespace and forbids two packs from sharing one, so a shared one would hand that namespace to whichever realm registered first, lock every other addon out of enums, and freeze that realm's command names for the life of the world.

| Command | Who | What |
| --- | --- | --- |
| `<ns>:config` | anyone | open this addon's config UI |
| `<ns>:config get <setting>` | anyone | read one of your own settings |
| `<ns>:config set <setting> <value>` | anyone | change one of your own settings |
| `<ns>:configat get <scope.setting> [target]` | operator | read any setting |
| `<ns>:configat set <scope.setting> <value> [target]` | operator | change any setting |
| `<ns>:guide` | anyone | this addon's guide, with the list under it |
| `<ns>:list` | anyone | the addon list, with this addon selected |

The verb and both setting enums are generated from the addon's config schema, so `get`/`set` and every setting autocomplete. The scope rides in the setting (`server.pricing.tax_rate`) rather than as its own argument: a parameter list is flat and positional with no branching, so a separate scope token would push the setting to position 3 or 4 depending on whether that scope takes a target, and a setting that moves cannot be an `Enum`. Arity is dispatched on the verb instead.

Two commands rather than one, because one command means one enum and one permission level: `:config` is `Any` and its enum holds only the runner's own player-scope settings, while `:configat` is `Admin`, which keeps it out of a non-operator's autocomplete entirely. Everything is `cheatsRequired: false`; authority comes from the permission level. Opt out with `ui(core, { commands: false })`.

## Permissions

Non-operators reach their own player scope only, enforced on both sides. Caller side: `clampTarget` narrows a request before the first render, the List's Config button goes straight to their own settings rather than a picker with one usable row, and the scope screens never enter their stack. Owner side: every read and write carries the viewing player as `actorId`, which the owning addon checks independently — covering a realm that fell back to an older copy of this UI. Operator status is read from the readonly `playerPermissionLevel`, never the script-writable `commandPermissionLevel`.

## Details

- A request that names a scope fetches that scope's values before mounting, so it opens showing what is actually set rather than every field at its schema default — `Config` presents a native modal and cannot fetch its own without presenting twice.
- bedrock-core has its own built-in guide covering the commands: the framework has a row in the list but no realm behind it, so nothing can publish one on its behalf.
- A screen opened for an addon whose config or guide has not replicated yet returns to the list with that addon selected, rather than showing a dead end.
- A rejected command registration names the addon's namespace and points at `core.id`, because Bedrock's own error names only the namespace that won.
- Every command description leads with the namespace. Bedrock gives the first pack to register a name an unqualified alias for it, with no way to opt out and no way to detect it in the callback, so plain `/guide` reaches one arbitrary addon — the description is what tells the player which.
- `@bedrock-core/server-runtime` is a **types-only** dependency — no value import, so the two build and version independently.
