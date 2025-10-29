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
  useEvent(system.afterEvents.scriptEventReceive, event => {
    setEventCount(prev => prev + 1);
    setLastEventId(event.id);
    setLastMessage(event.message);
  });

  return (
    <Panel width={192} height={140} x={414} y={160}>
      <Text width={192} height={20} x={424} y={170} value={'§l§bScript Events'} />
      <Text width={192} height={15} x={424} y={195} value={`Events: §l${eventCount}`} />
      <Text width={192} height={15} x={424} y={213} value={`ID: §7${lastEventId}`} />
      <Text width={192} height={15} x={424} y={231} value={`Msg: §7${lastMessage}`} />
      <Text width={192} height={12} x={424} y={255} value={'§6/scriptevent test'} />
      <Text width={192} height={12} x={424} y={273} value={'§6useEvent hook'} />
    </Panel>
  );
};
