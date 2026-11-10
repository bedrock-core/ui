---
"@bedrock-core/ui-runtime": patch
---

Reuse compiler-verified pure component output when scalar props remain equal. Preserve descendant updates, context/state invalidation and cleanup; evaluate object props, ordinary function props, accessors, inherited or hidden props, build probes, debug renders and render-order text composition normally.
