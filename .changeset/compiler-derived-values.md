---
"@bedrock-core/ui-runtime": patch
---

Reuse compiler-owned formatting results when scalar inputs remain equal. Recompute mutable object inputs and release cached values on inactive sites, failed renders and component cleanup.
