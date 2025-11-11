import { FunctionComponent, JSX, Panel, Text, useEvent, useState } from '@bedrock-core/ui';
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
  useEvent(system.afterEvents.scriptEventReceive, event => {
    setEventCount(prev => prev + 1);
    setLastEventId(event.id);
    setLastMessage(event.message);
  });

  return (
    <Panel width={192} height={140} x={414} y={310}>
      <Text width={192} height={20} x={10} y={10}>§l§bScript Events</Text>
      <Text width={192} height={15} x={10} y={35}>{`Events: §l${eventCount}`}</Text>
      <Text width={192} height={15} x={10} y={53}>{`ID: §7${lastEventId}`}</Text>
      <Text width={192} height={15} x={10} y={71}>{`Msg: §7${lastMessage}`}</Text>
      <Text width={192} height={12} x={10} y={95}>§6/scriptevent test</Text>
      <Text width={192} height={12} x={10} y={113}>§6useEvent hook</Text>
    </Panel>
  );
};
