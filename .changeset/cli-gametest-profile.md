---
'@bedrock-core/cli': minor
---

Scaffolded addons now come with a GameTest build profile. `yarn build:test` and `yarn watch:test` run the new `build-test` / `test` Regolith profiles, which bundle `packs/BP/scripts/gametest.ts` through `tsconfig.test.json` and export against `packs/BP/manifest.test.json` — the only manifest that declares the beta `@minecraft/server-gametest` module. An example suite in `packs/BP/scripts/tests/` runs with `/gametest runset example`.

The release path is untouched: `main.ts` never imports the test entry, so `yarn build` and `yarn watch` still produce a pack with no beta modules in its manifest. Every profile now runs the new `manifest` filter (`regolith-filters@manifest-1.0.0`) first so each one picks its own manifest variant, and the template moves to `bundler@1.1.2`, which reads the tsconfig its settings name.
