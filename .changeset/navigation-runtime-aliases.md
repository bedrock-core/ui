---
"@bedrock-core/ui-runtime": minor
"@bedrock-core/navigation": minor
---

Provide static navigators, route links and whole-host navigation through `@bedrock-core/navigation` and `@bedrock-core/ui/navigation`. The optional `@bedrock-core/navigation/core` entry point provides Core screen discovery, host openers, compiled reference presentation and cross-realm transport.

Expose generic render lifecycle notifications, screen metadata, selection panels and compiled action descriptions from the UI runtime. Plain rendering remains independent of navigation. `renderDestination()` in `@bedrock-core/navigation/runtime` preserves logical destination context in asynchronous host openers.

Version navigation independently from the UI runtime, including prereleases. The root UI package mirrors the runtime version; release checks validate that match and exact runtime dependency resolution.
