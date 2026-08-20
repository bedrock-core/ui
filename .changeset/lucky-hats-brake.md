---
'@bedrock-core/cli': patch
---

The `ore-styled` template's scaffolded sources now import through the two meta packages the template actually installs — `core` from `@bedrock-core/server`, and `ui` / `createI18n` / navigation / ore-styled through the `@bedrock-core/ui` subpaths (`/config`, `/i18n`, `/navigation`, `/ore-styled`).

0.10.1 slimmed the template's dependencies down to the meta packages but left the sources importing the individual packages (`@bedrock-core/server-runtime`, `@bedrock-core/config`, `@bedrock-core/i18n`, `@bedrock-core/navigation`, `@bedrock-core/ore-styled`), which a fresh scaffold no longer declares — so new projects could not resolve them.
