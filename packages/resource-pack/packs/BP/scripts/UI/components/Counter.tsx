import { JSX, Panel, Text, Button, FunctionComponent, useState, useEffect, useRef, useExit } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * Interactive counter component demonstrating useState and useEffect hooks
 * with system.runInterval for periodic updates
 * Grid Position: Row 2, Column 2
 */
export const Counter: FunctionComponent = (): JSX.Element => {
  const exit = useExit();

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
    return (): void => {
      if (counterRef.current) {
        system.clearRun(counterRef.current);
        counterRef.current = undefined;
      }
    };
  }, [isAutoIncrement]);

  useEffect(() => {
    // console.error('Each execution');
  });

  // useEffect(() => {
  //   console.error('Mounted');

  //   return (): void => console.error('Unmounted');
  // }, []);

  useEffect(() => {
    // console.error(`Count changed: ${count}`);

    if (count >= 4) {
      exit();
    }
  }, [count]);

  return (
    <Panel width={'24%'} height={'31%'} x={'75%'} y={'36%'}>
      {/* Title */}
      <Text width={'100%'} height={'14%'} x={'5%'} y={'7%'}>{'§l§aCounter'}</Text>

      {/* Display current count */}
      <Text width={'100%'} height={'14%'} x={'5%'} y={'25%'}>{`Count: §l${count}`}</Text>

      {/* Auto-increment status (to the right of count) */}
      <Text width={'42%'} height={'11%'} x={'65%'} y={'25%'}>{`Auto: ${isAutoIncrement ? '§aON' : '§cOFF'}`}</Text>

      {/* Increment button */}
      <Button
        width={'42%'}
        height={'14%'}
        x={'5%'}
        y={'39%'}
        onPress={(): void => {
          setCount(prev => prev + 1);
        }}
      >
        <Text width={'100%'} height={'100%'} x={'6%'} y={'25%'}>{'§l+1'}</Text>
      </Button>

      {/* Decrement button */}
      <Button
        width={'42%'}
        height={'14%'}
        x={'53%'}
        y={'39%'}
        onPress={(): void => {
          setCount(prev => prev - 1);
        }}
      >
        <Text width={'100%'} height={'100%'} x={'6%'} y={'25%'}>{'§l-1'}</Text>
      </Button>

      {/* Toggle auto-increment */}
      <Button
        width={'90%'}
        height={'14%'}
        x={'5%'}
        y={'57%'}
        onPress={(): void => {
          setIsAutoIncrement(!isAutoIncrement);
        }}
      >
        <Text width={'100%'} height={'100%'} x={'3%'} y={'25%'}>{`§9${isAutoIncrement ? 'Stop' : 'Start'} Auto`}</Text>
      </Button>

      {/* Reset button */}
      <Button
        width={'90%'}
        height={'14%'}
        x={'5%'}
        y={'75%'}
        onPress={(): void => {
          setIsAutoIncrement(false);
          setCount(0);
        }}
      >
        <Text width={'100%'} height={'100%'} x={'3%'} y={'25%'}>{'§6Reset'}</Text>
      </Button>
    </Panel>
  );
};
