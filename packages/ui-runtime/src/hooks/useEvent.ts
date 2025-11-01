import { EventSignal } from './types';
import { useEffect } from '.';

/**
 * Automatically subscribes to a Minecraft event signal and handles cleanup on unmount.
 *
 * This hook wraps useEffect to provide a convenient way to listen to game events
 * without manually managing subscribe/unsubscribe calls. The subscription is automatically
 * cleaned up when the component unmounts or when dependencies change.
 *
 * @param signal - Event signal to subscribe to (e.g., world.afterEvents.playerJoin)
 * @param callback - Function to call when the event fires
 * @param options - Optional subscription options (e.g., BlockEventOptions for block events)
 * @param deps - Optional dependency array to control when to resubscribe (defaults to [signal, callback, options])
 *
 * @example
 * // Subscribe to player join events
 * function PlayerMonitor() {
 *   const [players, setPlayers] = useState<string[]>([]);
 *
 *   useEvent(world.afterEvents.playerJoin, (event) => {
 *     setPlayers(prev => [...prev, event.playerName]);
 *   });
 *
 *   return (
 *     <Panel>
 *       <Text>Players: {players.join(', ')}</Text>
 *     </Panel>
 *   );
 * }
 *
 * @example
 * // Subscribe to block events with options
 * function BlockMonitor() {
 *   const player = usePlayer();
 *
 *   useEvent(
 *     world.beforeEvents.playerBreakBlock,
 *     (event) => {
 *       player.sendMessage(`Breaking ${event.block.typeId}`);
 *     },
 *     { blockTypes: ['minecraft:diamond_ore'] } // Only trigger for diamond ore
 *   );
 *
 *   return <Panel>...</Panel>;
 * }
 *
 * @example
 * // Subscribe with custom dependencies
 * function ChatLogger() {
 *   const [enabled, setEnabled] = useState(true);
 *
 *   const handleChat = (event: ChatSendAfterEvent) => {
 *     if (enabled) {
 *       console.log(`${event.sender.name}: ${event.message}`);
 *     }
 *   };
 *
 *   // Only resubscribe when enabled changes
 *   useEvent(world.afterEvents.chatSend, handleChat, undefined, [enabled]);
 *
 *   return <Panel>...</Panel>;
 * }
 *
 * @example
 * // Multiple event subscriptions
 * function MultiEventComponent() {
 *   const player = usePlayer();
 *
 *   useEvent(world.afterEvents.playerJoin, (event) => {
 *     player.sendMessage(`${event.playerName} joined!`);
 *   });
 *
 *   useEvent(world.afterEvents.playerLeave, (event) => {
 *     player.sendMessage(`${event.playerName} left!`);
 *   });
 *
 *   return <Panel>...</Panel>;
 * }
 */
export function useEvent<T, TOptions = Record<string, unknown>>(
  signal: EventSignal<T, TOptions>,
  callback: (event: T) => void,
  options?: TOptions,
  deps?: unknown[],
): void {
  useEffect(() => {
    // Subscribe to the event signal with optional options
    // Minecraft pattern: subscribe returns the callback, must call unsubscribe explicitly
    signal.subscribe(callback, options);

    // Return cleanup function that calls unsubscribe with the callback
    return () => {
      signal.unsubscribe(callback);
    };
  }, [...deps ?? [], signal, callback, options]); // Use provided deps or default to [signal, callback, options]
}
