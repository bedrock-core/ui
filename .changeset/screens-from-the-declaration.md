---
'@bedrock-core/navigation': minor
---

`registerDeclared` hands the realm what the build compiled on an addon's behalf: the addon's page in the shared list, drawn from its manifest. The realm publishes it on the first tick. The module the ui-compiler filter generates calls it; an addon does not.
