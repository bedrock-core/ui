import { JSX, Panel, Text, Button, FunctionComponent, useState, useEffect, useRef } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * Interactive counter component demonstrating useState and useEffect hooks
 * with system.runInterval for periodic updates
 * Grid Position: Row 2, Column 2
 */
export const Counter: FunctionComponent = (): JSX.Element => {
  const [count, setCount] = useState(0);
  const [isAutoIncrement, setIsAutoIncrement] = useState(false);
  const counterRef = useRef<number | undefined>(undefined);

  // Auto-increment every second when enabled using system.runInterval
  // This demonstrates proper cleanup with system.clearRun()
  useEffect(() => {
    if (!isAutoIncrement) {
      return;
    }

    if (!counterRef.current) {
      counterRef.current = system.runInterval(() => {
        setCount((prev: number): number => prev + 1);
      }, 20); // 20 ticks = 1 second
    }

    // Cleanup: clear interval when effect re-runs or component unmounts
    return () => {
      if (counterRef.current) {
        system.clearRun(counterRef.current);
        counterRef.current = undefined;
      }
    };
  }, [isAutoIncrement]);

  return (
    <Panel width={192} height={140} x={616} y={160}>
      {/* Title */}
      <Text width={192} height={20} x={10} y={10} value={'§l§aCounter'} />

      {/* Display current count */}
      <Text width={192} height={20} x={10} y={35} value={`Count: §l${count}`} />

      {/* Auto-increment status (to the right of count) */}
      <Text width={80} height={15} x={124} y={35} value={`Auto: ${isAutoIncrement ? '§aON' : '§cOFF'}`} />

      {/* Increment button */}
      <Button
        width={81}
        height={20}
        x={10}
        y={55}
        onPress={(): void => {
          setCount(prev => prev + 1);
        }}>
        <Text width={81} height={20} x={5} y={5} value={'§l+1'} />
      </Button>

      {/* Decrement button */}
      <Button
        width={81}
        height={20}
        x={101}
        y={55}
        onPress={(): void => {
          setCount(prev => prev - 1);
        }}>
        <Text width={81} height={20} x={5} y={5} value={'§l-1'} />
      </Button>

      {/* Toggle auto-increment */}
      <Button
        width={172}
        height={20}
        x={10}
        y={80}
        onPress={(): void => {
          setIsAutoIncrement(!isAutoIncrement);
        }}>
        <Text width={172} height={20} x={5} y={5} value={`§9${isAutoIncrement ? 'Stop' : 'Start'} Auto`} />
      </Button>

      {/* Reset button */}
      <Button
        width={172}
        height={20}
        x={10}
        y={105}
        onPress={(): void => {
          setIsAutoIncrement(false);
          setCount(0);
        }}>
        <Text width={172} height={20} x={5} y={5} value={'§6Reset'} />
      </Button>
    </Panel>
  );
};
