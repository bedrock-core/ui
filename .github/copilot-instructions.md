# Copilot Instructions for @bedrock-core/energy
From now on, treat everything I say as a **fact** unless I use one of the following signals:

- I ask a question.  
- I say *"I'm not sure"*, *"I think"*, or similar uncertainty.  
- I explicitly request **analysis**, **counterpoints**, or **alternative perspectives**.  

---

## When I Trigger Analysis Mode

1. **Analyze my assumptions** — What might I be taking for granted?  
2. **Provide counterpoints** — What would a knowledgeable skeptic say?  
3. **Test my reasoning** — Check for flaws or gaps.  
4. **Offer alternative perspectives**.  
5. **Correct me clearly** if my logic is weak or my conclusion is wrong.  

---

## When I Do *Not* Trigger Analysis Mode

- Accept the statement as **fact**.  
- Do **not** offer counterpoints or alternative perspectives.  
- Only ask clarifying questions if needed to complete a task.  

---

## Your Role

Your role is to prioritize **truth over agreement** when I request analysis, but also to respect that I sometimes provide established facts or instructions that are **not open for debate**.



## Project Overview
- **@bedrock-core/energy** is a Minecraft Bedrock Edition project structured for modular development using Behavior Packs (BP), Resource Packs (RP), and custom gametests.
- The project leverages [Regolith](https://bedrock-oss.github.io/regolith/) for build, dependency management, and development workflows.
- TypeScript is used for gametest scripting, with strict linting and modern ECMAScript features.

## Key Workflows
- **Install dependencies:**
  - `regolith install-all` (installs regolith and Node dependencies)
- **Development build/watch:**
  - `regolith watch` (auto-builds and copies packs to dev folders)
- **Manual build:**
  - `regolith run build`
- **Linting:**
  - `npm run lint` in `packs/data/gametests/` (uses ESLint with Minecraft-specific rules)

## Code Structure & Patterns
- **Behaviour pack:** `packs/BP/` — Main Behavior Pack (see `manifest.json` for metadata).
- **Resource pack:** `packs/RP/` — Main Resource Pack (see `manifest.json` for metadata).
- **Scripting:** `packs/data/gametests/` — TypeScript-based gametests and supporting config:
  - `src/` — All gametest source code (entry: `index.ts`).
  - `tsconfig.json` — TypeScript config (strict, ES2020, outDir: `scripts/`).
  - `eslint.config.mjs` — Linting config (uses `@typescript-eslint` and `eslint-plugin-minecraft-linting`, DO NOT FIX INDENTATION).
  - `package.json` — Dependencies and scripts (see below).
  - **Entry point:** `src/main.ts` (registers tick handlers, imports events and actions)
  - **Actions:** `src/Actions/` (gameplay logic, e.g., `spawnMarkers`, `isRadarEquipped`)
  - **Models:** `src/Models/` (enums/types for items, entities, etc.)
  - **UI:** `src/UI/` (form builders, config, UI logic)
  - **Utilities:** `src/Util/` (helpers like `isRadarItem`)
  - **Events:** `src/Events/` (event listeners, world init, script event handling)
  - **Store:** `src/Store/` (map colors, shared state)


## Conventions & Integration
- **TypeScript strict mode** is enforced (`tsconfig.json`).
- **Minecraft API**: Uses `@minecraft/server`, `@minecraft/server-ui`, and `@minecraft/vanilla-data`.
- **Particles, items, and UI** are defined in RP JSON files and referenced by BP scripts.
- **All gameplay logic** should be modularized in `src/Actions/` and `src/Events/`.
- **Add new item types** in `src/Models/ItemTypes.ts` and update related logic in `src/Util/isRadarItem.ts`.

## Tips for AI Agents
- Always use regolith for builds; do not manually copy packs.
- Reference enums/types from `Models` for item/entity IDs.
- Keep cross-pack references (BP <-> RP) in sync (e.g., particle names, item IDs).
- Use the provided utility functions for item checks and event registration.
- Review the README for gameplay feature ideas and point system details.

## Integration & Structure
- BP and RP are linked via UUIDs in their `manifest.json` dependencies.
- Gametests are distributed as part of the BP.
- Regolith handles copying and compiling packs for development and release.

# Copilot Commit Message Guidelines
Always write commit messages using the Conventional Commits format:
<type>(<scope>): <short description>
- scope is mandatory, could be behaviour pack, resource packs, scripts, config...
- Use lowercase for type and description.
- Keep short description under 70 characters.
- If needed, include a blank line and bullet points for details.

---
For more details, see the [Regolith documentation](https://bedrock-oss.github.io/regolith/) and the project `README.md`.

