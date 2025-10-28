import { JSX, Panel, Text, Button, FunctionComponent, useState, useEffect, useRef } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * ============================================================================
 * useRef EXAMPLE - Timer and Previous Value Tracking
 * ============================================================================
 */

/**
 * RefTimer - Demonstrates useRef for storing mutable values
 * Shows how refs don't trigger re-renders
 * Grid Position: Row 1, Column 4
 */
export const RefTimer: FunctionComponent = (): JSX.Element => {
  const [count, setCount] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const previousCountRef = useRef<number>(0);

  // Track render count (updates on every render)
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  // Store previous count value
  useEffect(() => {
    previousCountRef.current = count;
    console.log(`[RefTimer] Previous: ${previousCountRef.current}, Current: ${count}`);
  }, [count]);

  const startTimer = (): void => {
    if (intervalRef.current !== null) return;

    console.log('[RefTimer] Starting timer (stored in ref)');
    intervalRef.current = system.runInterval(() => {
      setCount(prev => prev + 1);
    }, 20); // Every second
  };

  const stopTimer = (): void => {
    if (intervalRef.current === null) return;

    console.log('[RefTimer] Stopping timer (from ref)');
    system.clearRun(intervalRef.current);
    intervalRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current !== null) {
      console.log('[RefTimer] Cleaning up timer on unmount');
      system.clearRun(intervalRef.current);
    }
  }, []);

  return (
    <Panel width={220} height={140} x={700} y={10}>
      <Text width={220} height={20} x={710} y={20} value={'§l§dRef Timer'} />
      <Text width={220} height={15} x={710} y={45} value={`Count: §e${count}`} />
      <Text width={220} height={15} x={710} y={63} value={`Renders: §6${renderCount}`} />

      <Button
        width={100}
        height={20}
        x={710}
        y={85}
        onPress={(): void => {
          startTimer();
        }}>
        <Text width={100} height={20} x={760} y={89} value={'§aStart'} />
      </Button>

      <Button
        width={100}
        height={20}
        x={815}
        y={85}
        onPress={(): void => {
          stopTimer();
        }}>
        <Text width={100} height={20} x={865} y={89} value={'§cStop'} />
      </Button>

      <Button
        width={205}
        height={20}
        x={710}
        y={110}
        onPress={(): void => {
          stopTimer();
          setCount(0);
        }}>
        <Text width={205} height={20} x={812} y={114} value={'§6Reset'} />
      </Button>
    </Panel>
  );
};
