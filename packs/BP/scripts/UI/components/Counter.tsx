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

  // Log count changes to console (no setState here)
  useEffect(() => {
    console.log(`[Counter Effect] Count changed to: ${count}`);
  }, [count]);

  // Auto-increment every second when enabled using system.runInterval
  // This demonstrates proper cleanup with system.clearRun()
  useEffect(() => {
    if (!isAutoIncrement) {
      console.log('[Counter Effect] Auto-increment disabled');

      return;
    }

    console.log('[Counter Effect] Starting auto-increment interval');
    const intervalId = system.runInterval(() => {
      setCount(prev => prev + 1);
    }, 20); // 20 ticks = 1 second

    // Cleanup: clear interval when effect re-runs or component unmounts
    return () => {
      console.log('[Counter Effect] Clearing auto-increment interval');
      system.clearRun(intervalId);
    };
  }, [isAutoIncrement]);

  return (
    <Panel width={192} height={140} x={212} y={160}>
      {/* Title */}
      <Text width={192} height={20} x={222} y={170} value={'§l§aCounter'} />

      {/* Display current count */}
      <Text width={192} height={20} x={222} y={195} value={`Count: §l${count}`} />

      {/* Auto-increment status */}
      <Text width={192} height={15} x={222} y={218} value={`Auto: ${isAutoIncrement ? '§aON' : '§cOFF'}`} />

      {/* Increment button */}
      <Button
        width={81}
        height={20}
        x={222}
        y={240}
        onPress={(): void => {
          setCount(prev => prev + 1);
        }}>
        <Text width={81} height={20} x={227} y={245} value={'§l+1'} />
      </Button>

      {/* Decrement button */}
      <Button
        width={81}
        height={20}
        x={313}
        y={240}
        onPress={(): void => {
          setCount(prev => prev - 1);
        }}>
        <Text width={81} height={20} x={318} y={245} value={'§l-1'} />
      </Button>

      {/* Toggle auto-increment */}
      <Button
        width={172}
        height={20}
        x={222}
        y={265}
        onPress={(): void => {
          setIsAutoIncrement(!isAutoIncrement);
        }}>
        <Text width={172} height={20} x={227} y={270} value={`§9${isAutoIncrement ? 'Stop' : 'Start'} Auto`} />
      </Button>
    </Panel>
  );
};
