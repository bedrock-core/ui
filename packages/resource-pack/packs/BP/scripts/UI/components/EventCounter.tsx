import { FunctionComponent, JSX, Panel, Text, useEffect, useEvent, useState } from '@bedrock-core/ui';
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

  useEffect(() => {
    system.sendScriptEvent('bc-ui:test', 'EventCounter mounted');
  }, []);

  return (
    <Panel width={192} height={140} x={414} y={160}>
      <Text width={192} height={20} x={10} y={10} value={'§l§bScript Events'} />
      <Text width={192} height={15} x={10} y={35} value={`Events: §l${eventCount}`} />
      <Text width={192} height={15} x={10} y={53} value={`ID: §7${lastEventId}`} />
      <Text width={192} height={15} x={10} y={71} value={`Msg: §7${lastMessage}`} />
      <Text width={192} height={12} x={10} y={95} value={'§6/scriptevent test'} />
      <Text width={192} height={12} x={10} y={113} value={'§6useEvent hook'} />
    </Panel>
  );
};
