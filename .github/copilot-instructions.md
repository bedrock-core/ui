## @bedrock-core/ui – AI Coding Instructions

Focused guidance for automated coding agents working on this repository. Keep it concise, align with current architecture, do not invent undocumented protocols.

### 1. Purpose & Core Concept
This library builds richer Minecraft Bedrock UIs by serializing component trees into text slots of `@minecraft/server-ui` forms. A lightweight declarative API (functions like `Panel`, `Text`, `Input`) returns structured component objects plus a `serialize(form)` method used by `present(...)` to inject encoded state into a form title (or other fields later). A companion resource pack (outside this repo) interprets those payloads using JSON UI binding expressions.

### 2. Architectural Primitives
- Component shape: JSON UI spec types in `src/types/json_ui/*.ts` (`components.ts` + `properties.ts`).
- Runtime wrapper type: `Functional<T>` = underlying component interface + `serialize(form: FormData) => string` (see `types/index.ts`).
- Presentation entrypoint: `present(form: ModalFormData, player, component)` in `src/present.ts` – calls `component.serialize(form)`, sets `form.title(serialized)`, then `form.show(player)`.
- Components are pure factory functions returning a `Functional<...>` object; they should NOT mutate external state; they may call `form.*` API methods inside `serialize` to register interactive controls (e.g. `form.dropdown(...)`).

### 3. Serialization Protocol (Critical)
Defined in `core/serializer.ts`.
- Fixed-width, UTF‑8 byte constrained fields; padded with `;` (PAD_CHAR) – NOT spaces.
- Widths: String=32, Integer=20, Float=24, Boolean=5 (`true`/`false`).
- Numbers: choose integer vs float width by `Number.isInteger`. Floats stored as raw `toString()` (do not localize / format). Booleans lowercase.
- All fields concatenated sequentially; no delimiters beyond fixed padding.
- Use `utf8Truncate` to avoid splitting surrogate pairs; never introduce new padding semantics without updating README + keeping backward compatibility.
- When extending protocol: only append new fixed-width segments at the end to preserve legacy decoding offsets.

### 4. Current Gaps / TODO Areas (safe to implement)
Many `serialize` placeholders return `''`. Implementations should:
1. Collect the minimal data required for client JSON UI conditions (label text, option indices, toggle state, layout info if needed).
2. Produce a single encoded string (or join multiple segments if future multiplexing is added) that fits inside Minecraft form text limits.
3. Return that string; also register interactive elements via `form.*` BEFORE returning.
Avoid over-encoding raw large text; respect field widths or introduce a version tag + extended block appended after legacy segment.

### 5. Adding a New Component
1. Define/extend interface in `types/json_ui/components.ts` if it maps to a JSON UI control; otherwise reuse an existing one.
2. Create `core/components/<Name>.ts` exporting a factory `Name(props): Functional<NameComponent>`.
3. Populate structural properties (size, max_size) using `'default'` fallback exactly like existing components for consistency.
4. Implement `serialize(form)` using `serialize(...)` helper for compact payload segments.
5. Export via `core/components/index.ts` and re-export from root `src/index.ts`.

### 6. Conventions & Style
- Size / dimension props: accept `number | string`; pass through unchanged; fallback `'default'` (never `undefined`).
- Use camelCase for factory prop names; output object keys must match JSON UI spec (snake / lower with underscores) exactly (see existing files as canonical mapping).
- Do not introduce side effects inside component factories; limit side-effectful operations to `serialize`.
- Keep public API stable: renaming exported factories or prop interfaces is a breaking change (project still 0.x but aim for forward migration ease).

### 7. Build / Tooling
- Build: `yarn build` (pure `tsc`). Tests: `yarn test` (Vitest). Lint: `yarn lint`.
- `tsconfig.json` excludes `*.test.ts` from build output; place tests under `src/**/__tests__/**` or `*.test.ts` – they won’t emit artifacts.
- Module type: ESM (`"type": "module"`). Entry: `dist/index.js`.

### 8. External Dependencies
- Runtime peers: `@minecraft/server` (≥2.1.0), `@minecraft/server-ui` (≥2.0.0). Keep imports shallow; avoid bundling peers.

### 9. Safety / Guardrails for Agents
- Never change fixed field widths without explicit migration section added to README & instructions.
- Preserve padding char `;` – changing it would break client parsing logic (resource pack side expects it).
- Avoid adding heavy dependencies; library intended to stay lightweight (just TypeScript + peers).
- When unsure about protocol extension, append new fields instead of reordering existing ones.
 
### 10. Example Pattern (future complete state)
```
export function Toggle({...}): Functional<ToggleComponent> {
	return {
		type: 'toggle',
		serialize(form) {
			form.toggle(label, { defaultValue: checked });
			return serialize(label, checked); // 32 + 5 bytes
		}
	};
}
```

### 11. Where to Look First
- Protocol: `core/serializer.ts`
- Presentation flow: `present.ts`
- Component patterns: `core/components/*.ts`
- Type contracts: `types/json_ui/*.ts`
- Usage examples (commented): `main.example.ts`

If any of the above seems ambiguous (e.g., how the resource pack decodes offsets), request clarification instead of guessing.