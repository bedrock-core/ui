import { Button, JSX, Panel, Text } from '../../..';

export function ButtonExample(): JSX.Element {
  return (
    <Panel width={384} height={256} x={48} y={48}>
      <Text
        width={320}
        height={24}
        x={32}
        y={24}
        value={'Click a button below:'} />

      <Button
        width={280}
        height={40}
        x={52}
        y={80}
        onPress={() => {
          console.log('First button pressed!');
        }}>
        <Text
          width={280}
          height={40}
          x={52}
          y={80}
          value={'First Button'} />
      </Button>

      <Button
        width={280}
        height={40}
        x={52}
        y={130}
        onPress={() => {
          console.log('Second button pressed!');
        }}>
        <Text
          width={280}
          height={40}
          x={52}
          y={130}
          value={'Second Button'} />
      </Button>

      <Button
        width={280}
        height={40}
        x={52}
        y={180}
        onPress={() => {
          console.log('Third button pressed!');
        }}>
        <Text
          width={280}
          height={40}
          x={52}
          y={130}
          value={'Third Button'} />
      </Button>
    </Panel>
  );
}
