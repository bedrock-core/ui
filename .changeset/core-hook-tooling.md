---
"@bedrock-core/ui-runtime": minor
"@bedrock-core/navigation": minor
"@bedrock-core/ore-styled": patch
---

Expose typed Core hook lint tooling through `@bedrock-core/ui/eslint` and export the navigation scope hook as `useCurrentScope`.

Publish shared resource packs for minor releases and changed patch assets, retaining the existing artifact for unchanged patches.

Connect cross-addon navigation through peer modules with observable screen metadata and runtime-owned cleanup. Use Observable's `Signal`, `NativeSignal`, and `toSignal` in `useEvent` to forward native filters and release each registration.
