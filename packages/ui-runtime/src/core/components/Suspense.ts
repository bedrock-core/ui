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
   * Child components - may contain useSuspendedState hooks
   */
  children: JSX.Node;

  /**
   * Fallback UI to show while suspended
   */
  fallback: JSX.Element;
}

/**
 * Suspense boundary component that shows a fallback while child components are suspended.
 *
 * A component is considered suspended when it uses useSuspendedState() and hasn't
 * initialized that state yet (i.e., the state value hasn't changed from its default).
 *
 * Suspense boundaries do nothing if no children use useSuspendedState().
 *
 * @example
 * function DataPanel() {
 *   const [data, setData] = useSuspendedState<Data | null>(null);
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
 *     <Suspense fallback={<Panel><Text value="Loading..." /></Panel>}>
 *       <DataPanel />
 *     </Suspense>
 *   );
 * }
 */
export const Suspense: FunctionComponent<SuspenseProps> = ({ children, fallback }): JSX.Element => {
  const instance = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error('Suspense can only be used within a component');
  }

  // Initialize suspension state on instance (in memory, not useState)
  if (!instance.suspensionState) {
    instance.suspensionState = {
      isSuspended: true,
      hasChecked: false,
    };
  }

  const suspensionState = instance.suspensionState;

  // Track which component initialized its suspended state
  const onChildInitialize = (): void => {
    suspensionState.isSuspended = false;

    // Close all forms and ensure re-render happens (not skipped by isProgrammaticClose)
    instance.isProgrammaticClose = false;

    system.run(() => {
      uiManager.closeAllForms(instance.player);
    });
  };

  // On mount, register callback for when child suspends
  useEffect(() => {
    if (!instance) return;

    // Register callback for when child suspends
    instance.onSuspendedStateInitialize = onChildInitialize;
    suspensionState.hasChecked = true;

    return () => {
      instance.onSuspendedStateInitialize = undefined;
    };
  }, []); // Empty dependency - run only once on mount

  // Show fallback while suspended
  if (suspensionState.isSuspended && suspensionState.hasChecked) {
    return fallback;
  }

  // Show children

  return Fragment({ children });
};

