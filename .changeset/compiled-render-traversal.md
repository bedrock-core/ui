---
"@bedrock-core/ui-runtime": patch
---

Index fibers by render owner, read baked props once per form or chest allocation, and assign text channels in one tree traversal. Preserve the order of handlers and carried values.
