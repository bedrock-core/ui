import { JSX, Panel, Text } from '@bedrock-core/ui';

/**
 * Simple example UI component
 * 
 * This demonstrates the basic structure of a UI component using @bedrock-core/ui.
 * The UI will be displayed when a player pushes a stone button (see main.ts).
 */
export const Example = (): JSX.Element => {
  return (
    <Panel
      width={300}
      height={200}
      x={0}
      y={0}
    >
      <Text
        text="Welcome to @bedrock-core/ui!"
        width={280}
        height={30}
        x={10}
        y={10}
      />
      <Text
        text="This is a simple example. Start building your UI here!"
        width={280}
        height={30}
        x={10}
        y={50}
      />
    </Panel>
  );
};
