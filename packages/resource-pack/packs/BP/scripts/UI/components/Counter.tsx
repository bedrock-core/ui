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

  // Auto-increment every second when enabled using system.runInterval
  // This demonstrates proper cleanup with system.clearRun()
  useEffect(() => {
    if (!isAutoIncrement) {
      return;
    }

    const intervalId = system.runInterval(() => {
      setCount((prev: number): number => {
        if (prev + 1 === 5) {
          setIsAutoIncrement(false); 
        }

        console.log(`[Counter Effect] isAutoIncrement changed to: ${isAutoIncrement}`);
        console.log(`[Counter Effect] Count changed to: ${prev + 1}`);
        return prev + 1;
      });
    }, 20); // 20 ticks = 1 second

    // Cleanup: clear interval when effect re-runs or component unmounts
    return () => {
      system.clearRun(intervalId);
    };
  }, [isAutoIncrement]);

  return (
    <Panel width={192} height={140} x={616} y={160}>
      {/* Title */}
      <Text width={192} height={20} x={626} y={170} value={'§l§aCounter'} />

      {/* Display current count */}
      <Text width={192} height={20} x={626} y={195} value={`Count: §l${count}`} />

      {/* Auto-increment status */}
      <Text width={192} height={15} x={626} y={218} value={`Auto: ${isAutoIncrement ? '§aON' : '§cOFF'}`} />

      {/* Increment button */}
      <Button
        width={81}
        height={20}
        x={626}
        y={240}
        onPress={(): void => {
          setCount(prev => prev + 1);
        }}>
        <Text width={81} height={20} x={631} y={245} value={'§l+1'} />
      </Button>

      {/* Decrement button */}
      <Button
        width={81}
        height={20}
        x={717}
        y={240}
        onPress={(): void => {
          setCount(prev => prev - 1);
        }}>
        <Text width={81} height={20} x={722} y={245} value={'§l-1'} />
      </Button>

      {/* Toggle auto-increment */}
      <Button
        width={172}
        height={20}
        x={626}
        y={265}
        onPress={(): void => {
          setIsAutoIncrement(!isAutoIncrement);
        }}>
        <Text width={172} height={20} x={631} y={270} value={`§9${isAutoIncrement ? 'Stop' : 'Start'} Auto`} />
      </Button>
    </Panel>
  );
};
