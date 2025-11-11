import {
  JSX,
  Panel,
  Text,
  Button,
  useState,
  useEffect,
} from "@bedrock-core/ui";
import { system } from "@minecraft/server";

/**
 * Simple example UI component
 *
 * This demonstrates the basic structure of a UI component using @bedrock-core/ui.
 * The UI will be displayed when a player pushes a stone button (see main.ts).
 */
export const Example = (): JSX.Element => {
  const [count, setCount] = useState(0);
  const [auto, setAuto] = useState(false);

  // Background auto increment effect (runs while form label snapshot is displayed)
  useEffect(() => {
    if (!auto) return;
    const interval = system.runInterval(
      () => setCount((prev: number) => prev + 1),
      20,
    );
    return () => system.clearRun(interval);
  }, [auto]);

  return (
    <Panel width={310} height={170} x={0} y={0}>
      <Text
        width={300}
        height={20}
        x={5}
        y={5}
      >{`§lWelcome to @bedrock-core/ui!`}</Text>
      <Text width={300} height={20} x={5} y={28}>{`Count: §e${count}`}</Text>
      <Button
        width={145}
        height={22}
        x={5}
        y={52}
        onPress={() => setCount((c: number) => c + 1)}
      >
        <Text width={145} height={22} x={5} y={4}>
          §a+1
        </Text>
      </Button>
      <Button
        width={145}
        height={22}
        x={160}
        y={52}
        onPress={() => setCount((c: number) => c - 1)}
      >
        <Text width={145} height={22} x={5} y={4}>
          §c-1
        </Text>
      </Button>
      <Button
        width={300}
        height={22}
        x={5}
        y={78}
        onPress={() => setAuto((a: boolean) => !a)}
      >
        <Text width={300} height={22} x={5} y={4}>
          {auto ? "§6Stop Auto" : "§9Start Auto"}
        </Text>
      </Button>
      <Button
        width={300}
        height={22}
        x={5}
        y={104}
        onPress={() => {
          setAuto(false);
          setCount(0);
        }}
      >
        <Text width={300} height={22} x={5} y={4}>
          §dReset
        </Text>
      </Button>
      <Text
        width={300}
        height={20}
        x={5}
        y={130}
      >{`Auto: ${auto ? "§aON" : "§cOFF"}`}</Text>
    </Panel>
  );
};
