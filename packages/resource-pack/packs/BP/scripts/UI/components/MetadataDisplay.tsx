import { FunctionComponent, JSX, Panel, Text, useRef } from '@bedrock-core/ui';

export const MetadataDisplay: FunctionComponent = (): JSX.Element => {
  const executionCount = useRef(0);

  executionCount.current += 1;

  return (
    <Panel width={192} height={140} x={616} y={10}>
      <Text width={192} height={20} x={10} y={10}>
        §l§dMetadata display
      </Text>
      <Text width={192} height={15} x={10} y={35}>
        {`Execution count: §6${executionCount.current}`}
      </Text>
    </Panel>
  );
};
