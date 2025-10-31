import { fiberRegistry } from '../core/fiber';

/**
 * Hook that provides a function to properly exit/close the current UI without triggering re-renders.
 *
 * This hook returns a function that when called will:
 * 1. Mark the component instance as closing to prevent re-renders
 * 2. Clean up effects and unmount the component
 * 3. Remove the instance from the fiber registry
 *
 * This is essential for exit/close buttons that should terminate the UI session
 * rather than trigger another render cycle.
 *
 * @returns Function to call when you want to exit the UI
 *
 * @example
 * function ExitButton() {
 *   const exit = useExit();
 *
 *   return (
 *     <Button onPress={exit}>
 *       <Text>Exit</Text>
 *     </Button>
 *   );
 * }
 *
 * @example
 * // Exit with custom logic
 * function SaveAndExitButton() {
 *   const exit = useExit();
 *   const player = usePlayer();
 *
 *   const handleSaveAndExit = () => {
 *     player.sendMessage('Settings saved!');
 *     exit();
 *   };
 *
 *   return (
 *     <Button onPress={handleSaveAndExit}>
 *       <Text>Save & Exit</Text>
 *     </Button>
 *   );
 * }
 */
export function useExit(): () => void {
  const instance = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error(
      'useExit can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  return (): void => {
    // Mark instance as programmatic close to prevent re-renders
    instance.isProgrammaticClose = true;
  };
}
