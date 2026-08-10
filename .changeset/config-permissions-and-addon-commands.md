---
'@bedrock-core/config': minor
---

Per-addon commands generated from the config schema, permission-gated editing, and a types-only dependency on the runtime.

**Commands live under the addon's own namespace** (`core.id`, e.g. `bt_gc_graves`) — there is no shared `core:*` surface. Bedrock permits a pack exactly one command-enum namespace and forbids two packs from sharing one, so a shared surface would hand that namespace to whichever realm registered first, lock every other addon out of enums, and freeze that realm's command names and parameter lists for the life of the world. Per-addon namespaces mean nothing is contended, nothing is elected, and updating an addon updates its commands on the next world load.

| Command | Who | What |
| --- | --- | --- |
| `<ns>:config` | anyone | open this addon's config UI |
| `<ns>:config get <setting>` | anyone | read one of your own settings |
| `<ns>:config set <setting> <value>` | anyone | change one of your own settings |
| `<ns>:configat get <scope.setting> [target]` | operator | read any setting |
| `<ns>:configat set <scope.setting> <value> [target]` | operator | change any setting |
| `<ns>:guide` | anyone | this addon's guide, with the list under it |
| `<ns>:list` | anyone | the addon list, with this addon selected |

The verb and both setting enums come from the addon's config schema, so `get`/`set` and every setting autocomplete. The scope rides in the setting (`server.pricing.tax_rate`) rather than as its own argument: a parameter list is flat and positional with no branching, so a separate scope token would push the setting to position 3 or 4 depending on whether that scope takes a target, and a setting that moves cannot be an `Enum`. Arity is dispatched on the verb instead — for `get` the next argument is the target, for `set` it is the value and the one after is the target.

Two commands rather than one, because one command means one enum and one permission level: `:config` is `Any` and its enum holds only the runner's own player-scope settings, while `:configat` is `Admin`, which keeps it out of a non-operator's autocomplete entirely. Everything is `cheatsRequired: false`; authority comes from the permission level instead. Opt out with `ui(core, { commands: false })`.

**Non-operators reach their own player scope only.** `clampTarget` narrows a deep link before the first render, the scope pickers and entity roster hide what a player may not open, and every screen passes the viewing player as `actorId` so the owning addon enforces the same rule independently — which is what covers a realm running an older copy of this UI. Operator status is read from the readonly `playerPermissionLevel`, never the script-writable `commandPermissionLevel`.

A command that names a scope fetches that scope's values before mounting, so it opens showing what is actually set rather than every field at its schema default — `Config` presents a native modal and cannot fetch its own without presenting twice.

A rejected registration names the addon's namespace and points at `core.id`, because Bedrock's own error names only the namespace that won. A refused `scope` enum degrades that parameter to a plain string rather than costing the command.

`@bedrock-core/server-runtime` is a **types-only** dependency — no value import, so the two build and version independently.
