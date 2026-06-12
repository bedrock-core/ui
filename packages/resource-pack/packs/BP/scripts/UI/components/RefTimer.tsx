import { JSX, Panel, Text, FunctionComponent, useState, useEffect, useRef } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';
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

  // Track render count on mount and whenever count changes.
  // Avoid setState-on-every-render loops that can trigger watchdog hangs.
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, [count]);

  // Store previous count value
  useEffect(() => {
    previousCountRef.current = count;
  }, [count]);

  const startTimer = (): void => {
    if (intervalRef.current !== null) {
      return;
    }

    intervalRef.current = system.runInterval(() => {
      setCount(prev => prev + 1);
    }, 20); // Every second
  };

  const stopTimer = (): void => {
    if (intervalRef.current === null) {
      return;
    }

    system.clearRun(intervalRef.current);
    intervalRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => (): void => {
    if (intervalRef.current !== null) {
      system.clearRun(intervalRef.current);
    }
  }, []);

  return (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{'§dRef Timer'}</Text>
      <Text>{`Count: §e${count}`}</Text>
      <Text>{`Renders: §6${renderCount}`}</Text>

      <Panel flexDirection={'row'} gap={6}>
        <Button onPress={(): void => { startTimer(); }}>{'§aStart'}</Button>
        <Button variant={'danger'} onPress={(): void => { stopTimer(); }}>{'§cStop'}</Button>
      </Panel>

      <Button
        variant={'secondary'}
        onPress={(): void => {
          stopTimer();
          setCount(0);
        }}
      >
        {'§6Reset'}
      </Button>
    </Panel>
  );
};
