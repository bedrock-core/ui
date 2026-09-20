---
'@bedrock-core/ui-runtime': minor
'@bedrock-core/ore-styled': minor
---

`@bedrock-core/i18n` is a peer dependency. An addon installs it once, beside `@bedrock-core/server`, so the instance `createI18n()` creates is the one `core.register()` publishes and the one text measurement reads. `@bedrock-core/ui` no longer re-exports it: import `createI18n` from `@bedrock-core/server/i18n`, or from `@bedrock-core/i18n` directly.
