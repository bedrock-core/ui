---
"@bedrock-core/ui-runtime": patch
---

Reuse pure child output with stable compiler-owned callbacks only for verified handler-forwarding props. Changed callback captures refresh child output, while arbitrary functions, object props and accessors remain live.
