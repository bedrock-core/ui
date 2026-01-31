import { FunctionComponent, JSX, Panel, Text, useRef } from '@bedrock-core/ui';

export const MetadataDisplay: FunctionComponent = (): JSX.Element => {
  const executionCount = useRef(0);

  executionCount.current += 1;

  return (
    <Panel width={24} height={31} x={75} y={2}>
      <Text width={100} height={14} x={5} y={7}>
        {'§l§dMetadata display'}
      </Text>
      <Text width={100} height={11} x={5} y={25}>
        {`Execution count: §6${executionCount.current}`}
      </Text>
    </Panel>
  );
};
