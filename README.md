# @bedrock-core/ui

![Logo](./assets/logo/title.png)

> ⚠️ Beta Status: Active development. Breaking changes may occur until 1.0.0. Pin exact versions for stability.
>
> This is not ready for production use.

Custom JSX-driven UI system for Minecraft Bedrock. Components serialize into compact strings decoded by a companion resource pack to render rich layouts beyond native `@minecraft/server-ui` limitations.

📘 Full documentation & guides: https://bedrock-core.drav.dev/

![Preview](./assets/preview.png)

---

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

### ✅ Beta 0.3.0

- No features, just fixes to workflows and automated releases.

### ✅ Beta 0.4.0 - Styling

- ✅ Flex, margins, paddings, spacing...

### ✅ Beta 0.5.0 - Theming

- ✅ Component theming system → shipped via [@bedrock-core/ore-styled](./packages/ore-styled/README.md)

### ✅ Beta 0.6.0 - Navigation & Item Rendering

- ✅ Stack-based multi-screen navigation system
- ✅ Screen parameters and typed route state
- ✅ Navigation hooks: `useNavigation()`, `useRoute()`
- ✅ `NavigationContainer`, `createStackNavigator`, `Screen`
- ✅ `ItemRenderer` component — render item icons inside layouts
- ✅ `useSetScreen` hook — override screen layout per build
- ✅ Ore-Styled item components: `ItemSlot`, `ItemContainer`, `EquipmentSlots`

### ✅ Beta 0.7.0 - Interactive Components & Custom Natives

- ✅ Custom native component API — register your own native JSON UI components compatible with @bedrock-core/ui
- ✅ Modal-backed form primitives in `@bedrock-core/ui`: `Input`, `Dropdown`, `Slider`  (v0)
- ✅ Ore-Styled form fields in `@bedrock-core/ore-styled`: `Input`, `Dropdown`, `Slider`
- ✅ Scroll fixes — corrected scroll sizing and removed the fixed screen layout

### ✅ Beta 0.8.0 - Multi-Scroll & Layout Polish

- ✅ `<Scroll>` component — declare up to 4 independent scroll regions per render (pool protocol v0007)

### 🚧 Beta 0.X.0 - Forms (Planned)

- Form submission and validation helpers

### 🚧 Beta 0.X.0 - More core components (Planned)

- Entity render(?)
- Structure render(?)


### 👀 Beta 0.X.0 - [REDACTED] (Planned)

- ?
- ?
- ?

### 🚀 Future Considerations

- Compound components (tabs, menus, dialogs)
- Animation support
- Resource pack builder automation
- Reactive data binding (if feasible)
- Export feature for "non-form" JSON UI
- Support for translations params (key:string, with: string[]) in SerializableString

## 🤝 Contributing

Let's talk in Discord <https://bedrock-core.drav.dev/discord>

For technical documentation and implementation details, see:

- [UI Runtime Package](./packages/ui-runtime/README.md) - Core framework internals
- [Flexbox](./packages/flexbox/README.md) - Layout engine
- [Ore-Styled Components](./packages/ore-styled/README.md) - Optional prebuilt Ore-UI styled components
- [Resource Pack](./packages/resource-pack/README.md) - Test addon and reference
- [CLI Tool](./packages/cli/README.md) - Project scaffolding

## 📖 Resources

- [Bedrock Wiki - JSON UI Introduction](https://wiki.bedrock.dev/json-ui/json-ui-intro)
- [JSON UI Documentation](https://wiki.bedrock.dev/json-ui/json-ui-documentation)

## What about ore-ui/DDUI?

**ore-ui**: When it releases in `Number.MAX_SAFE_INTEGER` years, will consider if it is worth to port for ore-ui.
**DDUI**: It cannot be made compatible, DDUI does not use JSON UI so we cannot use the same methods.

## Notes
Common web behaviour is one web has a single or multiple theme but all controlled by the same team/person.

Here in Minecraft we may have multiple addons each with their own UI, styling...
