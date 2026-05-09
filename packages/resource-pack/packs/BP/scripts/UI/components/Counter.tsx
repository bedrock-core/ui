import { JSX, Panel, Text, Button, FunctionComponent, useState, useEffect } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * Interactive counter component demonstrating useState and useEffect hooks
 * with system.runInterval for periodic updates
 * Grid Position: Row 2, Column 2
 */
export const Counter: FunctionComponent = (): JSX.Element => {
  const [count, setCount] = useState(0);
  const [isAutoIncrement, setIsAutoIncrement] = useState(false);

  useEffect(() => {
    // Keep effect to demonstrate dependency usage without side effects.
  }, [count]);

  // Auto-increment every second when enabled using system.runInterval
  // This demonstrates proper cleanup with system.clearRun()
  useEffect(() => {
    if (!isAutoIncrement) {
      return;
    }

    const intervalId = system.runInterval(() => {
      setCount(prev => prev + 1);
    }, 20); // 20 ticks = 1 second

    // Cleanup: clear interval when effect re-runs or component unmounts
    return (): void => {
      system.clearRun(intervalId);
    };
  }, [isAutoIncrement]);

  return (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      {/* Title */}
      <Text>{'§aCounter'}</Text>

      {/* Display current count */}
      <Text>{`Count: ${count}`}</Text>

      {/* Auto-increment status */}
      <Text>{`Auto: ${isAutoIncrement ? '§aON' : '§cOFF'}`}</Text>

      <Panel flexDirection={'row'} gap={6}>
        {/* Increment button */}
        <Button
          onPress={(): void => {
            setCount(prev => prev + 1);
          }}
        >
          <Text>{'+1'}</Text>
        </Button>

        {/* Decrement button */}
        <Button
          onPress={(): void => {
            setCount(prev => prev - 1);
          }}
        >
          <Text>{'-1'}</Text>
        </Button>
      </Panel>

      {/* Toggle auto-increment */}
      <Button
        onPress={(): void => {
          setIsAutoIncrement(!isAutoIncrement);
        }}
      >
        <Text>{`§9${isAutoIncrement ? 'Stop' : 'Start'} Auto`}</Text>
      </Button>
    </Panel>
  );
};
