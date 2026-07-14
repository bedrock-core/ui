# @bedrock-core/config

The shared **addon list + config + guide UI** for [`@bedrock-core/ui`](https://github.com/bedrock-core/ui).
Every registered addon mounts it with one line; one realm serves the UI for all of them, because the
registry, config schemas, guides, and translation keys replicate over sync.

```ts
import { core } from '@bedrock-core/server-runtime';
import { ui } from '@bedrock-core/config';

core.register({ /* ...identity, translations, guide, config... */ });
ui(core);             // registers core:list / core:guide / core:config (first-wins across realms)
```

`ui(core)` registers the three custom commands (first-wins across realms — see `commands.ts`); the
winning realm renders the UI for every addon. No runtime-side seam is involved: this package simply
imports the runtime it needs and renders with `@bedrock-core/ui-runtime`.

## API

- `ui(core)` — mount the shared config UI on a runtime. Call once, after `core.register()`.
  (`setupConfigUI` is a back-compat alias.)
- `App({ core, player, target })` — the root screen component, exported for custom mounts; owns its
  `NavigationContainer` and stacks the list / config / guide screens.

## Screens

| Route | Screen |
| --- | --- |
| `List` | every registered addon; entry point |
| `ConfigScope` | pick world / dimension / player scope for an addon |
| `EntityList` | pick a dimension or player to configure |
| `Config` / `ConfigList` | the addon's config fields for the chosen scope |
| `GuideContents` / `GuidePage` | the addon's guide (via `@bedrock-core/guides`) |

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
