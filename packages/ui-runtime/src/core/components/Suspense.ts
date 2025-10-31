import { JSX, FunctionComponent } from '../../jsx';
import { Fragment } from './Fragment';
import { useEffect } from '../hooks/useEffect';
import { fiberRegistry } from '../fiber';
import { system } from '@minecraft/server';
import { uiManager } from '@minecraft/server-ui';

/**
 * Props for the Suspense boundary component
 */
export interface SuspenseProps {

  /**
   * Child components - may contain useState hooks
   */
  children: JSX.Node;

  /**
   * Fallback UI to show while suspended
   */
  fallback: JSX.Element;

  /**
   * Optional timeout in milliseconds. If provided, Suspense will stop waiting
   * and render children after this duration, even if some states haven't resolved.
   */
  timeout?: number;
}

/**
 * Suspense boundary component that shows a fallback while child components have unresolved state.
 *
 * A component is considered suspended when it uses useState() and the state value
 * hasn't changed from its initial value yet.
 *
 * Suspense boundaries only check on first mount - they don't re-suspend on subsequent renders.
 *
 * @example
 * function DataPanel() {
 *   const [data, setData] = useState<Data | null>(null);
 *
 *   useEffect(() => {
 *     fetchData().then(setData); // Triggers suspension resolution
 *   }, []);
 *
 *   return <Panel><Text value={data?.name} /></Panel>;
 * }
 *
 * export function App() {
 *   return (
 *     <Suspense fallback={<Panel><Text value="Loading..." /></Panel>} timeout={5000}>
 *       <DataPanel />
 *     </Suspense>
 *   );
 * }
 */
export const Suspense: FunctionComponent<SuspenseProps> = ({ children, fallback, timeout }): JSX.Element => {
  const instance = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error('Suspense can only be used within a component');
  }

  // Initialize suspension state on instance (in memory, not useState)
  if (!instance.suspensionState) {
    instance.suspensionState = {
      isSuspended: false,
      hasResolved: false,
      trackedHookIndices: [],
    };
  }

  const suspensionState = instance.suspensionState;

  // Helper to check if all tracked states have resolved
  const checkAllStatesResolved = (): boolean => {
    return suspensionState.trackedHookIndices.every(hookIndex => {
      const hook = instance.hooks[hookIndex];
      if (!hook || hook.type !== 'state') return true;
      
      const stateHook = hook as { value: unknown; initialValue: unknown };
      return !Object.is(stateHook.value, stateHook.initialValue);
    });
  };

  // Callback when any state changes
  const onStateChange = (): void => {
    if (!suspensionState.isSuspended || suspensionState.hasResolved) {
      return; // Already resolved, nothing to do
    }

    if (checkAllStatesResolved()) {
      suspensionState.isSuspended = false;
      suspensionState.hasResolved = true;

      // Clear timeout if exists
      if (suspensionState.timeoutId !== undefined) {
        system.clearRun(suspensionState.timeoutId);
        suspensionState.timeoutId = undefined;
      }

      // Close all forms and ensure re-render happens
      instance.isProgrammaticClose = false;

      system.run(() => {
        uiManager.closeAllForms(instance.player);
      });
    }
  };

  // CRITICAL: Check suspension status BEFORE rendering children
  // This runs on every render, but only sets up tracking on first mount
  if (!suspensionState.hasResolved) {
    // Record current hook count before children might add more
    const hookCountBefore = instance.hooks.length;

    // If this is not the first time (hooks already exist), check if resolved
    if (hookCountBefore > 0 && suspensionState.trackedHookIndices.length > 0) {
      const allResolved = checkAllStatesResolved();
      
      if (!allResolved) {
        // Still suspended, return fallback
        return fallback;
      } else {
        // All resolved! Mark as complete
        suspensionState.hasResolved = true;
        suspensionState.isSuspended = false;
      }
    } else if (hookCountBefore === 0) {
      // First render - need to let children create hooks, then check next render
      suspensionState.isSuspended = true;
    }
  }

  // On mount, set up suspension tracking
  useEffect(() => {
    if (!instance || suspensionState.hasResolved) {
      return; // Already resolved, don't re-suspend
    }

    // At this point, children have already been rendered and hooks created
    // Find all StateHooks that exist in the instance
    const stateHookIndices: number[] = [];
    for (let i = 0; i < instance.hooks.length; i++) {
      const hook = instance.hooks[i];
      if (hook && hook.type === 'state') {
        stateHookIndices.push(i);
      }
    }

    suspensionState.trackedHookIndices = stateHookIndices;

    // Check if any states are unresolved
    const allResolved = checkAllStatesResolved();
    
    if (!allResolved) {
      suspensionState.isSuspended = true;

      // Register callback for state changes
      instance.onStateChange = onStateChange;

      // Set up timeout if provided
      if (timeout !== undefined && timeout > 0) {
        suspensionState.timeoutId = system.runTimeout(() => {
          if (suspensionState.isSuspended) {
            suspensionState.isSuspended = false;
            suspensionState.hasResolved = true;

            // Force render with whatever values we have
            instance.isProgrammaticClose = false;
            system.run(() => {
              uiManager.closeAllForms(instance.player);
            });
          }
        }, timeout);
      }
      
      // Trigger immediate re-render to show fallback
      instance.isProgrammaticClose = false;
      system.run(() => {
        uiManager.closeAllForms(instance.player);
      });
    } else {
      suspensionState.hasResolved = true;
    }

    return () => {
      instance.onStateChange = undefined;
      if (suspensionState.timeoutId !== undefined) {
        system.clearRun(suspensionState.timeoutId);
      }
    };
  }, []); // Empty dependency - run only once on mount

  // Show fallback while suspended
  if (suspensionState.isSuspended) {
    return fallback;
  }

  // Show children
  return Fragment({ children });
};

