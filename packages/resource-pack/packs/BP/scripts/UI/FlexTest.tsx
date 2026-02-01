import { JSX, Panel, Text } from '@bedrock-core/ui';

export function FlexTest(): JSX.Element {
  return (
    <Panel
      display={'flex'}
      flexDirection={'column'}
      gap={'5%'}
      width={'100%'}
      height={'100%'}
    >
      {/* Row 1: Basic row layout with equal flex grow */}
      <Panel display={'flex'} flexDirection={'row'} gap={'5%'} flexGrow={1}>
        <Panel flexGrow={1}>
          <Text>{'Box 1'}</Text>
        </Panel>
        <Panel flexGrow={1}>
          <Text>{'Box 2'}</Text>
        </Panel>
        <Panel flexGrow={1}>
          <Text>{'Box 3'}</Text>
        </Panel>
      </Panel>

      {/* Row 2: Different flex grow values */}
      {/* <Panel display={'flex'} flexDirection={'row'} gap={'5%'} flexGrow={1}>
        <Panel flexGrow={1}>
          <Text>{'Grow 1'}</Text>
        </Panel>
        <Panel flexGrow={2}>
          <Text>{'Grow 2'}</Text>
        </Panel>
        <Panel flexGrow={1}>
          <Text>{'Grow 1'}</Text>
        </Panel>
      </Panel> */}

      {/* Row 3: Column layout with different alignments */}
      {/* <Panel display={'flex'} flexDirection={'row'} gap={'5%'} flexGrow={1}>
        <Panel display={'flex'} flexDirection={'column'} gap={'3%'} flexGrow={1} justifyContent={'flex-start'}>
          <Text>{'Start'}</Text>
          <Text>{'Aligned'}</Text>
        </Panel>
        <Panel display={'flex'} flexDirection={'column'} gap={'3%'} flexGrow={1} justifyContent={'center'}>
          <Text>{'Center'}</Text>
          <Text>{'Aligned'}</Text>
        </Panel>
        <Panel display={'flex'} flexDirection={'column'} gap={'3%'} flexGrow={1} justifyContent={'flex-end'}>
          <Text>{'End'}</Text>
          <Text>{'Aligned'}</Text>
        </Panel>
      </Panel> */}

      {/* Row 4: Mixed sizes with padding */}
      {/* <Panel display={'flex'} flexDirection={'row'} gap={'5%'} flexGrow={1}>
        <Panel padding={'5%'} flexGrow={1}>
          <Text>{'Padded'}</Text>
        </Panel>
        <Panel flexGrow={2}>
          <Text>{'No padding'}</Text>
        </Panel>
        <Panel padding={'5%'} flexGrow={1}>
          <Text>{'Padded'}</Text>
        </Panel>
      </Panel> */}
    </Panel>
  );
}
