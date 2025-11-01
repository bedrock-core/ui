import { JSX, Panel, Text } from '@bedrock-core/ui';

export function Fallback(): JSX.Element {
  return (
    <Panel width={192} height={140} x={414} y={160}>
      <Text width={192} height={20} x={424} y={170} value={'§l§bScript Events'} />
      <Text width={192} height={15} x={424} y={195} value={'§7Loading events...'} />
    </Panel>
  );
}

