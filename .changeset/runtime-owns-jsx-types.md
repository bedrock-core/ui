---
"@bedrock-core/ui-runtime": patch
---

Remove the undeclared dependency on the `@bedrock-core/ui` umbrella package from Runtime's internal JSX types, so `@bedrock-core/ui-runtime` typechecks when installed directly.
