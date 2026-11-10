import { Button, Panel, Text, type JSX } from '@bedrock-core/ui-runtime';

const labels = ['One', 'Two'];

export function DirectArrayChildren(): JSX.Element {
  return <Panel>{labels.map(label => <Button key={label}><Text>{label}</Text></Button>)}</Panel>;
}

export function MixedArrayChildren(): JSX.Element {
  return (
    <Panel>
      <Text>{'Before'}</Text>
      {labels.map(label => <Button key={label}><Text>{label}</Text></Button>)}
      <Text>{'After'}</Text>
    </Panel>
  );
}

export function FragmentArrayChildren(): JSX.Element {
  return (
    <Panel>
      <Text>{'Before'}</Text>
      <>{labels.map(label => <Button key={label}><Text>{label}</Text></Button>)}</>
      <Text>{'After'}</Text>
    </Panel>
  );
}

export function NestedArrayChildren({ visible = true }: { visible?: boolean }): JSX.Element {
  return (
    <Panel>
      <Text>{'Before'}</Text>
      {labels.map(label => [false, null, undefined, [<Button key={label} visible={visible}><Text>{label}</Text></Button>]])}
      <Text>{'After'}</Text>
    </Panel>
  );
}
