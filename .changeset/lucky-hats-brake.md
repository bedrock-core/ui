---
'@bedrock-core/cli': patch
---

`--version` now reports the CLI's real version, and the scaffolded project installs the server stack through the `@bedrock-core/server` meta package.

- `bedrock-core --version` was hardcoded to `0.1.1` and had been wrong since that release. It now reads the version out of the CLI's own `package.json` at runtime, so the flag cannot drift from the published package again.
- The template's `@bedrock-core/config` + `@bedrock-core/i18n` + `@bedrock-core/server-runtime` dependencies collapse into the single `@bedrock-core/server` meta package — one install for the cross-addon server stack, matching how the docs describe it.
- The template pins `packageManager: yarn@4.18.0` and pre-approves `@bedrock-core/*` in `.yarnrc.yml`, so `yarn install` in a fresh project runs without the interactive build-script approval prompt.
