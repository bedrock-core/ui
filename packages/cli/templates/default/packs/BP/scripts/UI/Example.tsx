import {
  Button,
  JSX,
  Panel,
  Text,
  useEffect,
  useState,
} from '@bedrock-core/ui';
import { system } from '@minecraft/server';

export const Example = (): JSX.Element => {
  const [count, setCount] = useState(0);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) {
      return;
    }

    const interval = system.runInterval(
      () => setCount((prev: number) => prev + 1),
      20,
    );

    return () => system.clearRun(interval);
  }, [auto]);

  return (
    <Panel width={310} padding={5} gap={4}>
      <Text height={20}>{`§lWelcome to @bedrock-core/ui!`}</Text>
      <Text height={20}>{`Count: §e${count}`}</Text>
      <Panel flexDirection={'row'} gap={4}>
        <Button flex={1} height={22} onPress={() => setCount((c: number) => c + 1)}>
          <Text height={22}>{'§a+1'}</Text>
        </Button>
        <Button flex={1} height={22} onPress={() => setCount((c: number) => c - 1)}>
          <Text height={22}>{'§c-1'}</Text>
        </Button>
      </Panel>
      <Button
        height={22}
        onPress={() => setAuto((a: boolean) => !a)}
      >
        <Text height={22}>{auto ? '§6Stop Auto' : '§9Start Auto'}</Text>
      </Button>
      <Button
        height={22}
        onPress={() => {
          setAuto(false);
          setCount(0);
        }}
      >
        <Text height={22}>{'§dReset'}</Text>
      </Button>
      <Text height={20}>{`Auto: ${auto ? '§aON' : '§cOFF'}`}</Text>
    </Panel>
  );
};
