import { FunctionComponent, JSX, Panel, Text, useEvent, useState } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * Event counter - listens to script events and updates count using useEvent hook
 * Test with: /scriptevent demo:test hello
 * Grid Position: Row 3, Column 3
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
    <Panel width={24} height={31} x={51} y={67}>
      <Text width={100} height={14} x={5} y={7}>{'§l§bScript Events'}</Text>
      <Text width={100} height={11} x={5} y={25}>{`Events: §l${eventCount}`}</Text>
      <Text width={100} height={11} x={5} y={38}>{`ID: §7${lastEventId}`}</Text>
      <Text width={100} height={11} x={5} y={51}>{`Msg: §7${lastMessage}`}</Text>
      <Text width={100} height={9} x={5} y={68}>{'§6/scriptevent test'}</Text>
      <Text width={100} height={9} x={5} y={81}>{'§6useEvent hook'}</Text>
    </Panel>
  );
};
