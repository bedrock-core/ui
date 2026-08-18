---
'@bedrock-core/cli': patch
---

The scaffolding template ships its `.gitignore` under a name npm keeps.

npm strips `.gitignore` from published tarballs, so a scaffolded project came out without one. The template now carries it as `gitignore` and the generator restores the dot after copying.

Also in this release: the generator filter's schema output is ignored in the template's eslint config, the `@minecraft/server-ui` dependency is declared in the template BP manifest, and the template's regolith pins move to `guides-1.1.1` / `i18n-1.0.1`.
