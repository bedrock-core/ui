import { Player } from '@minecraft/server';
import { getCurrentFiber } from '../core/fiber';

/**
 * Returns the Player who opened/rendered this form.
 *
 * This hook provides access to the player instance that triggered the current component render.
 * The player reference remains constant for the lifetime of the component instance.
 *
 * @returns Player instance for this component
 * @throws Error if called outside a component context
 *
 * @example
 * function PlayerGreeting() {
 *   const player = usePlayer();
 *
 *   return (
 *     <Panel>
 *       <Text>Hello {player.name}!</Text>
 *       <Text>You are in {player.dimension.id}</Text>
 *     </Panel>
 *   );
 * }
 *
 * @example
 * // Using with other hooks
 * function InventoryViewer() {
 *   const player = usePlayer();
 *   const [itemCount, setItemCount] = useState(0);
 *
 *   useEffect(() => {
 *     const inventory = player.getComponent('inventory');
 *     setItemCount(inventory?.container?.size ?? 0);
 *   }, []);
 *
 *   return <Panel><Text>Items: {itemCount}</Text></Panel>;
 * }
 */
export function usePlayer(): Player {
  const fiber = getCurrentFiber();

  if (!fiber) {
    throw new Error(
      'usePlayer can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  return fiber.player;
}
