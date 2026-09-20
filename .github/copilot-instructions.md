# Copilot instructions for `@bedrock-core/ui`

This repository contains the UI libraries, compiler, scaffold CLI and the independently built shared render pack. Read the nearest package source and tests before changing behavior; the public docs live in the separate `bedrock-core/docs` repository.

## Repository map

- `src/` — the `@bedrock-core/ui` meta package and public subpath exports.
- `packages/ui-runtime/` — JSX, components, hooks, host-independent IR and host runtimes.
- `packages/ui-compiler/` — build-time compiler from a solved UI tree to JSON UI.
- `packages/navigation/` — screen keys, history and cross-addon screen references.
- `packages/ore-styled/` — styled components and design tokens.
- `packages/flexbox/` — layout engine.
- `packages/cli/` — `@bedrock-core/cli`; its current template is `templates/bedrock-core/`.
- `packages/resource-pack/` — independent project that builds the world-scoped `.mcpack` from released npm packages and released Regolith filters.

The UI libraries do not depend on the Apps packages. The resource-pack artifact and CLI template install the released Server and Apps packages because they compile framework screens and scaffold a full addon.

## Screen model

Screen modules end in `.screen.tsx`, default-export a component and are discovered by the Regolith `ui-compiler` filter. The build evaluates the component, solves its layout and writes JSON UI plus a generated screen module. Keep module-scope code safe on a build machine: subscriptions, world reads and scheduled game work belong in runtime entry modules.

The screen's shape is fixed at build time. State may change carried values and supported looks, but it must not add, remove or reorder controls. Conditional shapes need the compiler-supported visibility form.

Every screen has exactly one host root:

- `<Screen>` selects the action-form host.
- `<Form>` selects the native modal host. Use its modal fields, exactly one `Form.Button type={'submit'}`, and at most one exit button. A regular `Button`, nested host root or container-only control is invalid.
- `<Container entity={...}>` or `<Container block={...}>` selects the container host and names exactly one host type. A container screen has no single viewer, so `usePlayer()`, `useTranslation()` and `useNavigation()` have no valid player there. Read the player from handler events, use the free `navigate(key, player)` and `back(player)` functions, and use `i18n.key()` for static client-resolved keys.
- `<Embed>` is a compiled area owned by one addon and mounted in an area reserved by another screen.

Use `Panel`, `Text`, `Button`, fields and other public controls to compose addon components. `registerComponent`, writer functions and arbitrary host-element types are framework implementation interfaces; a native control requires matching runtime, compiler, host and render-pack support.

## Navigation and cross-addon screens

Compiled screens are addressed by keys such as `creator_pack:settings`. Static links use `to`; runtime navigation uses `navigate`, `back` and the player carried by the event. History stores screen keys and params. A screen compiled by another addon resolves through its published reference; do not import another addon's screen component.

Keep cross-addon data plain and explicit. The addon that compiled a screen owns its component and resource-pack definitions, while the calling realm supplies the values and handles returned presses through the reference protocol.

## Components and hosts

Put shared behavior in host-independent components and IR. Put form, container or future-screen mechanics in that host's build/runtime pair. A host owns its transport, allocation, routing, inputs and vanilla hook.

`withControl()` normalizes the common props of framework controls and records layout input. Addon components that compose public controls do not call it. When a framework primitive changes, update its component, lowering/allocation for every supported host, compiler output, render-pack definitions and focused tests together.

Container screens use real inventory slots as their runtime transport. Hidden carrier items must stay invisible, unfocusable and unavailable to the cursor. Empty output cells must block interaction without exposing a durability bar or tooltip. Test insert, take, drop, rapid press, close and reopen behavior in game after container changes.

## Resource-pack contract

The shared render pack is one half of the UI protocol. Changes to runtime payloads, compiler output, host routing, textures or JSON UI must be reflected in `packages/resource-pack/` and checked in game.

The resource-pack project uses exact public dependency versions. Do not add workspace links or repository checkouts to its release workflow. `bedrock-core/setup-regolith` installs the released filters. The resource-pack workflow builds the artifact from main, verifies the published Catalog framework snapshot, and attaches the `.mcpack` to the existing UI release. CurseForge upload is a separate optional job.

Run pack commands from `packages/resource-pack/`:

```bash
yarn install
yarn regolith-install
yarn lint
yarn build
yarn verify-framework
yarn deploy
```

Use `yarn deploy` after a pack-related change so the development world receives both packs for in-game verification.

## CLI template

The CLI template must work outside this monorepo with registry packages only. Keep released package versions, Regolith filters, generated path aliases and examples in sync. Do not commit a template lockfile whose project name is rewritten during scaffolding.

The release smoke test must generate a fresh project, run an ordinary install followed by an immutable install, install every Regolith filter, build the normal and GameTest profiles, and lint the scaffold. Reject `workspace:`, `link:`, `portal:` and `file:` references and unresolved template placeholders.

## Validation

For library changes, run the narrow package checks while iterating, then the relevant root gates:

```bash
yarn lint
yarn build
yarn test
```

For release-library checks, use `lint:libs`, `build:libs` and `test:libs`; the CLI is published separately and last. For compiler or host changes, add tests that assert user-visible validation, allocation or generated output rather than copying the implementation into assertions.

In-game verification is required for JSON UI, focus, cursor, tooltip, container interaction, navigation, translation and geometry behavior. Record the exact action, result and relevant client/server log lines.

## Code and documentation style

- Import through public package names in examples.
- Keep JSX attribute expressions explicit, such as `gap={4}` and `flexDirection={'row'}`.
- Use `console.warn` for diagnostic examples.
- Keep errors actionable: name the invalid component or screen and the supported fix.
- Document current behavior without migration history or roadmap promises.
- Preserve public exports deliberately; a type being exported does not make an internal protocol a supported addon extension point.
