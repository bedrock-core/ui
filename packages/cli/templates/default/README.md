# {{PROJECT_NAME}}

{{DESCRIPTION}}

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

2. **Install Regolith filters:**

   ```bash
   npm run regolith-install
   # or
   yarn regolith-install
   ```

3. **Build the addon:**

   ```bash
   npm run build
   # or
   yarn build
   ```

4. **Watch mode (auto-rebuild on changes):**

   ```bash
   npm run watch
   # or
   yarn watch
   ```

## Project Structure

```ts
├── packs/
│   ├── BP/              # Behavior Pack
│   │   ├── manifest.json
│   │   ├── scripts/
│   │   │   ├── main.ts           # Entry point
│   │   │   └── UI/
│   │   │       └── Example.tsx   # Example UI component
│   │   └── texts/
│   └── RP/              # Resource Pack
│       ├── manifest.json
│       ├── ui/          # JSON UI decoders (pre-configured)
│       └── texts/
├── config.json          # Regolith configuration
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

## Usage

The example UI will be displayed when a player pushes a **stone button** in-game.

You can modify `packs/BP/scripts/UI/Example.tsx` to customize the UI, or create new UI components.

## Development

### Creating UI Components

```tsx
import { JSX, Panel, Text, Button } from '@bedrock-core/ui';

export const MyUI = (): JSX.Element => {
  return (
    <Panel width={300} height={200}>
      <Text text="Hello World!" width={280} height={30} x={10} y={10} />
    </Panel>
  );
};
```

### Rendering UI

```typescript
import { render } from '@bedrock-core/ui';
import { Player } from '@minecraft/server';
import { MyUI } from './UI/MyUI';

render(player, MyUI, { key: 'my-ui' });
```

## Documentation

For full documentation, visit: <https://github.com/bedrock-core/ui>

## License

MIT © {{AUTHOR}}
