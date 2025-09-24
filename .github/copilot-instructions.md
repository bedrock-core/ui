## @bedrock-core/ui – AI Coding Instructions

Short, practical guidance for agents working in this repo. Follow current protocol; don’t invent new formats.

### What this library does
Serialize a declarative component tree into a compact string, inject it into `@minecraft/server-ui` form text (title), and let a JSON UI resource pack decode it to render rich UIs beyond native forms.

Key flow: component factory → `serialize(form)` → `present(form, player, component)` sets `form.title(payload)` → JSON UI decodes by fixed offsets.

### Architecture (files to know)
- Types: `src/types/json_ui/*.ts` (component contracts) and `src/types/*.ts` (functional wrapper).
- Serialization: `src/core/serializer.ts` (protocol + helpers).
- Components: `src/core/components/**/*.ts` (pure factories returning `Functional<T>` with `serialize`).
- Presentation: `src/present.ts` (calls `component.serialize(form)` then `form.show(player)`).
- Public API: `src/index.ts` re-exports.

### Serialization protocol (critical)
- Prefix: payload starts with `bcui` + VERSION (e.g., `bcuiv0001`). VERSION is declared near the serializer (`const VERSION = 'v0001'`). Decoders must skip these first 9 chars before field slicing.
- Field encoding per value:
	- Type prefixes: `s:` | `i:` | `f:` | `b:`
	- Core padded region uses `;` as the only pad char; UTF‑8 fixed-width; safe truncation via `utf8Truncate`.
	- Unique trailing 1-char marker per field disambiguates identical padded segments during JSON UI subtraction.
- Core padded lengths (bytes) and full slice widths (core + 2 prefix + 1 marker):
	- String: 32 → slice 35
	- Int: 16 → slice 19
	- Float: 24 → slice 27
	- Bool: 5 → slice 8
- Numbers use `Number.isInteger` to choose `i:` vs `f:`; booleans are lowercase `true`/`false`.
- Protocol evolution: only append new fields at the end; do not reorder or shrink earlier fields.

### Component pattern (authoring)
- Factories are pure; they return structural props matching JSON UI keys plus `serialize(form): string`.
- Inside `serialize`, call `form.*` to register interactive controls first (e.g., `form.dropdown(...)`), then return the encoded payload built with the serializer helper.
- Conventions: dimension props accept `number | string`, fallback to `'default'`; factory props are camelCase, emitted keys match JSON UI snake_case.

Example (intended final shape):
```ts
export function Toggle({ label, checked }: ToggleProps): Functional<ToggleComponent> {
	return {
		type: 'toggle',
		serialize(form) {
			form.toggle(label, { defaultValue: !!checked });
			return serialize({ type: 'toggle', label, checked: !!checked })[0];
		},
	};
}
```

### Dev workflow
- Build: `yarn build` (tsc)
- Test: `yarn test` (Vitest);
- Lint: `yarn lint`
Tests live under `src/**/__tests__/**` or `*.test.ts` (excluded from build output). ESM module, entry `dist/index.js`.

### Guardrails
- Do not change fixed widths or pad char `;`.
- Keep prefix `bcui` + VERSION intact; update VERSION only with documented migrations.
- Append fields instead of reordering; keep markers stable by position.
- Avoid heavy deps; peers are `@minecraft/server` and `@minecraft/server-ui`.

Start here: `core/serializer.ts`, `present.ts`, and a nearby component under `core/components/` to mirror patterns.