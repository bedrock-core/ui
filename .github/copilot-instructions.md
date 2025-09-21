# @bedrock-core/ui - AI Coding Instructions

## Core Innovation & Architecture

This is a revolutionary Minecraft Bedrock UI framework that exploits **text field data transmission** to bypass native `@minecraft/server-ui` limitations. The key breakthrough: serializing component data into form text fields (`#title_text`, `#form_button_text`, `#custom_text`) that JSON UI can parse via binding expressions for conditional rendering.

### Direct Component Architecture
1. **Direct TypeScript Component API** - Simple component functions that return JSON UI compatible objects
2. **JSON UI Configuration System** - Smart resource pack that parses embedded data and renders custom UI

The system works by calling component functions directly (like `Button({ label: 'Click me' })`) that return JSON UI compatible structures, then serializing this data into `ModalFormData.title()` fields for JSON UI parsing.

## Project Structure & Key Files

- `ARCHITECTURE.md` - **READ FIRST** - Complete technical specification and implementation details
- `src/temp/` - Contains JSON UI documentation, best practices, and the critical `server_form.json` reference
- `src/index.ts` - Currently empty, will contain the main `present()` API
- `package.json` - Note the Minecraft peerDependencies and ES module setup

## Development Workflow

### Build & Test Commands
```bash
yarn build          # TypeScript compilation to dist/
yarn test           # Vitest test runner
yarn coverage       # Test coverage reports
yarn lint           # ESLint with strict TypeScript rules
yarn clean          # Remove dist/ directory
```

### Key Configuration Files
- `vitest.config.ts` - Mocks `@minecraft/server` for testing
- `eslint.config.mjs` - Extremely strict TypeScript/style rules with `@stylistic` plugin
- `tsconfig.json` - ES2022 target, ESM modules, bundler resolution for Minecraft compatibility

## Unique Conventions & Patterns

### Component Interface Design
Components are direct function calls that return JSON UI compatible objects:
```typescript
// Direct component API (clean and simple)
const button = Button({
  label: 'Click me',
  width: 100,
  height: 30
});

const panel = Panel({
  display: 'flex',
  orientation: 'vertical',
  children: [
    Text({ value: 'Hello World' }),
    Button({ label: 'Save' })
  ]
});
```
  hover_control?: string;
}
```

### Property Group Inheritance
All components inherit from shared property group interfaces (`ControlProperties`, `LayoutProperties`, etc.) that map to documented JSON UI property groups. This provides both type safety and direct JSON UI compatibility.

### Serialization Protocol
Ultra-compact format designed for title field limitations:
- Enum-based component types (0-255)
- Property arrays instead of objects
- Optional compression with integrity checksums
- `bedrock_ui:` prefix for identification

### Element-Scoped Text Embedding
Different text fields provide different scopes:
- `#title_text` - Global form scope
- `#form_button_text` - Per-button scope  
- `#custom_text` - Per-element scope

## Critical Integration Points

### Minecraft Dependencies
- Requires `@minecraft/server` >=2.1.0 and `@minecraft/server-ui` >=2.0.0
- Must work in QuickJS environment (no Node.js APIs)
- Consumers need base addon dependency in their `manifest.json`

### JSON UI Resource Pack
The companion resource pack modifies `server_form.json` with conditional rendering based on text field prefixes. Elements are only visible when their identifier is detected in the appropriate text field.

## Development Guidelines

### TypeScript Standards
- Extremely strict ESLint rules with explicit return types required
- Private members must have leading underscore
- Consistent naming conventions enforced
- No `any` types, prefer specific interfaces

### Testing Setup
- Vitest with mocked Minecraft APIs
- Coverage tracking enabled
- Tests should be in `src/**/*.{test,spec}.ts` or `src/**/__tests__/`

### Component Development
When creating new components:
1. Create a clean interface with developer-friendly property names
2. Use object destructuring in function parameters
3. Return JSON UI compatible objects with proper type casting
4. Add to serialization protocol with new enum value
5. Create corresponding JSON UI configuration

### Current Component Pattern
All components follow this clean pattern:
```typescript
export interface ComponentProps {
  // Clean, minimal property definitions
  label?: string;
  width?: number | string;
  height?: number | string;
}

export function Component({ label, width, height }: ComponentProps): JSONUIComponent {
  return {
    type: 'json_ui_type',
    size: [width || 'default', height || 'default'],
    property_name: label,
  } as JSONUIComponent;
}
```

## Architecture Deep Dive

The system's genius is in the configuration-based approach rather than complex rendering. The JSON UI files are pre-configured with conditional rendering logic that activates based on embedded data patterns. This makes it maintainable and provides direct access to all JSON UI capabilities while offering a superior developer experience.

Key files to understand the full system:
- `ARCHITECTURE.md` sections 1-3 for component API design
- `src/temp/server_form.json` for the JSON UI integration patterns
- `src/temp/json-ui-documentation.md` for property group mappings
- `src/core/components/` for direct component implementations
