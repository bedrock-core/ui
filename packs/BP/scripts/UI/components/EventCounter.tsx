import { JSX, Panel, Text, FunctionComponent, useState, useEffect } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * Event counter - listens to script events and updates count
 * Test with: /scriptevent demo:test hello
 * Grid Position: Row 2, Column 1
 */
export const EventCounter: FunctionComponent = (): JSX.Element => {
  const [eventCount, setEventCount] = useState(0);
  const [lastEventId, setLastEventId] = useState('None');
  const [lastMessage, setLastMessage] = useState('-');

  // Subscribe to script events using useEffect
  // This demonstrates how effects can subscribe to external events with cleanup
  // No dependencies, so runs only on mount and unmount
  useEffect(() => {
    console.log('[EventCounter Effect] Setting up script event listener');

    const subscription = system.afterEvents.scriptEventReceive.subscribe(event => {
      console.log(`[EventCounter] Event received: ${event.id} - ${event.message}`);
      setEventCount(prev => prev + 1);
      setLastEventId(event.id);
      setLastMessage(event.message);
    });

    // Cleanup: unsubscribe when effect re-runs or component unmounts
    return () => {
      console.log('[EventCounter Effect] Cleaning up script event listener');
      system.afterEvents.scriptEventReceive.unsubscribe(subscription);
    };
  }, []);

  return (
    <Panel width={192} height={140} x={10} y={160}>
      <Text width={192} height={20} x={20} y={170} value={'§l§bScript Events'} />
      <Text width={192} height={15} x={20} y={195} value={`Events: §l${eventCount}`} />
      <Text width={192} height={15} x={20} y={213} value={`ID: §7${lastEventId}`} />
      <Text width={192} height={15} x={20} y={231} value={`Msg: §7${lastMessage}`} />
      <Text width={192} height={12} x={20} y={255} value={'§6/scriptevent test'} />
      <Text width={192} height={12} x={20} y={273} value={'§6Auto cleanup'} />
    </Panel>
  );
};
