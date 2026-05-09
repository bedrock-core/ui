import { JSX, Panel, Text, FunctionComponent, useState, useEvent } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * Event counter - listens to script events and updates count using useEvent hook
 * Test with: /scriptevent demo:test hello
 * Grid Position: Row 2, Column 1
 */
export const EventCounter: FunctionComponent = (): JSX.Element => {
  const [eventCount, setEventCount] = useState(0);
  const [lastEventId, setLastEventId] = useState('None');
  const [lastMessage, setLastMessage] = useState('-');

  // Subscribe to script events using useEvent hook
  // This demonstrates automatic event subscription with cleanup
  useEvent(system.afterEvents.scriptEventReceive, (event) => {
    setEventCount(prev => prev + 1);
    setLastEventId(event.id);
    setLastMessage(event.message);
  });

  return (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{'§bScript Events'}</Text>
      <Text>{`Events: ${eventCount}`}</Text>
      <Text>{`ID: §7${lastEventId}`}</Text>
      <Text>{`Msg: §7${lastMessage}`}</Text>
      <Text>{'§6/scriptevent test'}</Text>
      <Text>{'§6useEvent hook'}</Text>
    </Panel>
  );
};
