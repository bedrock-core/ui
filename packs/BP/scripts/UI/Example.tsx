import { Button, Fragment, Image, JSX, Panel, Text } from '@bedrock-core/ui';

export function Example(): JSX.Element {
  return (
    <>
      {/* Center panel with logo */}
      <Panel width={200} height={36} x={327} y={222}>
        <>
          <Image width={200} height={36} x={327} y={222} texture="textures/ui/core-ui/logo" />
        </>
        <Button width={100} height={36} x={427} y={250} label="Click Me" onPress={(): void => { console.log("test") }} />
      </Panel>

      {/* Right panel with text */}
      <Panel width={100} height={250} x={580} y={75}>
        <Text width={180} height={20} x={585} y={80} value="Right Side Text 1" />
        <Text width={180} height={20} x={585} y={110} value="Right Side Text 2" />
      </Panel>

      {/* Image in top left corner */}
      <Image width={32} height={32} x={10} y={10} texture="textures/items/apple" />

      {/* Text in bottom right corner */}
      <Text width={150} height={20} x={694} y={450} value="§l§gCustom text!" />
    </>
  );
}
