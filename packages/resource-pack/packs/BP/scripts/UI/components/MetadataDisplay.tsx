import { JSX, Panel, Text, FunctionComponent, useState, useEffect } from '@bedrock-core/ui';

export const MetadataDisplay: FunctionComponent = (): JSX.Element => {
  const [executionCount, setExecutionCount] = useState(0);

  // Track execution count (updates on every render)
  useEffect(() => {
    setExecutionCount(prev => prev + 1);
  });

  // NOTE: Timer logic moved to Counter component. This component now only shows execution count.

  return (
    <Panel width={192} height={140} x={616} y={10}>
      <Text width={192} height={20} x={10} y={10} value={'§l§dMetadata display'} />
      <Text width={192} height={15} x={10} y={35} value={`Execution count: §6${executionCount}`} />
    </Panel>
  );
};
