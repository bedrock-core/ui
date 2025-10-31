import { JSX, Panel, Text } from '@bedrock-core/ui';

// Import all grid components

// Import contexts

export function Fallback(): JSX.Element {
  return (
    <Panel width={192} height={140} x={10} y={310}>
      <Text width={192} height={20} x={20} y={320} value={'§l§6Player Info'} />
      <Text width={192} height={15} x={20} y={345} value={'§7Loading player data...'} />
    </Panel>
  );
}

