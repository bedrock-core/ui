# @bedrock-core/ui

![Logo](./assets/logo.svg)

> ⚠️ Beta Status: Active development. Breaking changes may occur until 1.0.0. Pin exact versions for stability.
>
> This is not ready for production use.

Custom UI system for Minecraft Bedrock that uses JSX to build declarative component trees. Components serialize into compact strings that a companion JSON UI resource pack decodes to render rich UIs beyond native `@minecraft/server-ui` limitations.

![Preview](./assets/preview.png)

---

## Why?

Working directly with JSON UI involves complex bindings, variables, and formatting challenges. This library abstracts away those complexities with a familiar JSX-based component model.

## ✨ How It Works

Native forms expose only a handful of text slots (`title_text`, `form_button_text`, `custom_text`, etc.). These strings can be read via JSON UI binding expressions. We exploit this by:

1. Building declarative component trees using JSX (`<Panel>`, `<Text>`, `<Image>`, etc.)
2. Serializing compact fixed-width field segments into a single string per component
3. Injecting that payload into form controls via `form.label()` calls
4. Having the resource pack parse segments by byte offset to drive conditional rendering

Result: Advanced layouts, conditional logic, and style variants without custom networking.

## 📦 Installation

### With CLI (Recommended)

The fastest way to get started is using our CLI tool to scaffold a complete project:

```bash
npx @bedrock-core/cli-ui
```

This will create a new addon with:

- ✅ `@bedrock-core/ui` pre-configured
- ✅ TypeScript and ESLint setup
- ✅ Regolith build configuration
- ✅ Companion resource pack included
- ✅ Working example to get started

After generation:

```bash
cd your-addon-name
yarn install          # or npm install
yarn regolith-install # Install Regolith filters
yarn build            # Build the addon
yarn watch            # Watch for changes and redeploy
```

### Manual Installation

If you're adding to an existing project:

```bash
yarn add @bedrock-core/ui
```

**Requirements:** `@minecraft/server` ≥ 2.3.0, `@minecraft/server-ui` ≥ 2.0.0

Download the companion resource pack from the [releases page](https://github.com/bedrock-core/ui/releases) and add it as a dependency in your behavior pack's `manifest.json`:

```json
{
  "dependencies": [
    {
        "uuid": "761ecd37-ad1c-4a64-862a-d6cc38767426",
        "version": [0, 1, 0]
    }
  ]
}
```

Include the resource pack in your `.mcaddon`:

```txt
pack.mcaddon
├── RP/                     (your addon's resource pack)
├── BP/                     (your addon's behavior pack)
└── core-ui-v0.1.0.mcpack   (companion resource pack from releases)
```

## 🚀 Quick Start

Configure your `tsconfig.json` for JSX support:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@bedrock-core/ui"
  }
}
```

Then use JSX to build your UI:

```tsx
import { Player } from '@minecraft/server';
import { render, Panel, Text } from '@bedrock-core/ui';

const ui = (
  <Panel width={300} height={200} x={50} y={50}>
    <Text 
      width={250}
      height={30}
      x={25}
      y={25}
      value="Player Settings"
    />
  </Panel>
);

await render(player, ui);
```

## 📚 Available Components

- **`<Panel>`** - Container for layout and grouping
- **`<Text>`** - Display text content
- **`<Image>`** - Display textures/images
- **`<Fragment>`** - Group children without wrapper
- **`<Suspense>`** - Handle async loading states
- **`<Button>`** - Interactive button

For detailed component APIs and technical documentation, see the [`@bedrock-core/ui-runtime` package](./packages/ui-runtime/README.md).

## 🗺 Development Roadmap

### ✅ Beta 0.1.0 - Core Foundation

- ✅ Serialization protocol with UTF-8 safety
- ✅ JSX runtime with custom component system
- ✅ Base components (`Panel`, `Text`, `Image`, `Fragment`)
- ✅ JSON UI resource pack decoder
- ✅ TypeScript library with proper exports

### ✅ Beta 0.2.0 - State & Button

- ✅ Component: `Button` with click events
- ✅ State management hooks
- ✅ Event system

### 🎨 Beta 0.3.0 - Theming & Styling (Planned)

- Component theming system
- Style variants (light/dark themes)
- Text formatting (colors, bold, underline)
- Automatic z-index layering
- Token based styling*

\* By using token based styling we might be able to avoid known caveats 1, thus have support for {number}(%, %c, %cm, %sm, %x, %y, px).

### 🧭 Beta 0.X.0 - Navigation (Planned)

- Multi-screen navigation system
- Screen parameters and state management
- Navigation hooks: `goBack()`, `navigate()`

### 🚧 Beta 0.X.0 - Interactive Components (Planned)

- Form components: `Input`, `Toggle`, `Slider`, `Dropdown`
- Form submission and validation

### 👀 Beta 0.X.0 - [REDACTED] (Planned)

- ?
- ?
- ?

### 🚀 Future Considerations

- Custom component registration API (create your own native JSON UI components compatible with @bedrock-core/ui)
- Compound components (tabs, menus, dialogs)
- Animation support
- Resource pack builder automation
- Reactive data binding (if feasible)
- Export feature for "non-form" JSON UI
- Support for translations params (key:string, with: string[]) in SerializableString

## 🤝 Contributing

Let's talk in Discord <https://bedrocktweaks.net/discord>

For technical documentation and implementation details, see:

- [UI Runtime Package](./packages/ui-runtime/README.md) - Core framework internals
- [Resource Pack](./packages/resource-pack/README.md) - Test addon and reference
- [CLI Tool](./packages/cli-ui/README.md) - Project scaffolding

## 📖 Resources

- [Bedrock Wiki - JSON UI Introduction](https://wiki.bedrock.dev/json-ui/json-ui-intro)
- [JSON UI Documentation](https://wiki.bedrock.dev/json-ui/json-ui-documentation)

## What about ore-ui?

When it releases in `Number.MAX_SAFE_INTEGER` years, will deprecate this completely (as JSON-UI will not exist) and look if it is worth to remake it for ore-ui.
