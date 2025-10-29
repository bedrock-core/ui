## @bedrock-core/ui Test Addon

This addon is a **test implementation** and **reference example** for the [`@bedrock-core/ui`](https://github.com/bedrock-core/ui) framework, demonstrating the complete integration of serialized UI components with Minecraft Bedrock's JSON UI system.

### What this addon does
Serves as both test environment and implementation guide for the `@bedrock-core/ui` framework. It shows how to:
- Use the framework's serialization protocol in a real Minecraft addon
- Configure JSON UI resource pack to decode the serialized component data
- Structure the build pipeline with Regolith for TypeScript → JavaScript bundling

Key flow: TypeScript components → Regolith bundler → Behavior Pack scripts → `present()` API → JSON UI decoding in Resource Packedrock-core/ui 

This are the instructions from the framework. We need to update them for this part which is the addon which uses the framework and has the json-ui de-serialization logic.

Short, practical guidance for agents working in this repo. Follow current protocol; don’t invent new formats.

### Architecture (critical files)

**Behavior Pack (TypeScript/JavaScript)**
- `packs/BP/scripts/main.ts` - Entry point, button event handler calling `present()`
- `packs/BP/scripts/UI/Example.ts` - Component factory using framework components like `Text()`
- `config.json` - Regolith configuration with bundler filter for TypeScript compilation

**Resource Pack (JSON UI Decoding)**
- `packs/RP/ui/_ui_defs.json` - Defines which JSON UI files to load and their byte ranges
- `packs/RP/ui/server_form.json` - Maps component types to JSON UI control definitions
- `packs/RP/ui/core-ui/properties/control.json` - Decodes serialized data using string slicing bindings
- `packs/RP/ui/core-ui/components/*.json` - Individual component definitions (text.json, panel.json, etc.)

**Build System**
- `filters/bundler/main.js` - Custom Regolith filter for TypeScript bundling and VS Code debug config generation

### Serialization decoding (JSON UI critical pattern)
The Resource Pack decodes the serialized string via precise byte offset slicing:

```jsonc
// Extract field after protocol header (9 chars: "bcuiv0001")
{
  "binding_type": "view", 
  "source_property_name": "('%.35s' * #rem_after_header)",  // Next 35 bytes
  "target_property_name": "#raw_type"
},
{
  "binding_type": "view",
  "source_property_name": "('%.32s' * #raw_type_core)",     // Skip prefix (2) + marker (1)
  "target_property_name": "#type_padded"
}
```

**Byte allocation map** (from `_ui_defs.json`):
- `control.json`: [0,127] - Core properties (type, visible, enabled, layer)  
- `layout.json`: [128,383] - Layout properties (width, height, x, y)
- [384,511] - Reserved for future core use
- [512+] - Component-specific data per type

### Development workflow

**Setup & Build**
```bash
regolith install-all      # Install dependencies
regolith watch           # Development with auto-rebuild
regolith run build       # Manual production build
```

**Component Development Pattern**
1. Create component factory in `packs/BP/scripts/UI/` using `@bedrock-core/ui` components
2. Add corresponding JSON UI definition in `packs/RP/ui/core-ui/components/`  
3. Register component type in `packs/RP/ui/server_form.json` control_ids mapping
4. Include component JSON in `packs/RP/ui/_ui_defs.json` with byte range

**Debug Setup**
The bundler filter auto-generates VS Code launch configuration for Minecraft script debugging with source maps pointing to local TypeScript files.

### Project-specific conventions

**Linked Dependencies**: Uses local link to `@bedrock-core/ui` framework via `package.json` - update path as needed

**TypeScript Errors**: `@ts-expect-error` comments for nested repo linking issues are expected

**Component Registration**: Always update both `server_form.json` control mapping AND `_ui_defs.json` when adding new component types

**Byte Management**: Never modify existing byte ranges in control/layout properties - only append new ranges for component-specific data

### Integration points
- Framework imports: `import { present, Text, Panel } from '@bedrock-core/ui'`
- Minecraft APIs: `@minecraft/server` for world events, `@minecraft/server-ui` for form presentation  
- Build integration: Regolith filter system with Node.js bundling
- Resource pack bindings: JSON UI string manipulation bindings for data extraction

### Critical serialization protocol (inherited from framework)
- Prefix: `bcui` + VERSION (9 chars total, e.g., `bcuiv0001`) - JSON UI must skip these before field extraction
- Field encoding: `s:`/`i:`/`f:`/`b:` prefixes + padded content + `;` padding + unique marker
- Fixed widths: String(35), Int(19), Float(27), Bool(8) - including prefix+marker
- **Never modify these widths** - breaks JSON UI decoding bindings

Start with: `packs/BP/scripts/UI/Example.ts` for component usage, `packs/RP/ui/core-ui/components/text.json` for JSON UI decoding patterns.