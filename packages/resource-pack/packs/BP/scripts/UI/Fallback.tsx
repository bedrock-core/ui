import { JSX, Panel, Text } from '@bedrock-core/ui';

interface FallbackProps {
  width: number;
  height: number;
  x: number;
  y: number;
}

export function Fallback({ width, height, x, y }: FallbackProps): JSX.Element {
  return (
    <Panel width={width} height={height} x={x} y={y}>
      <Text width={width} height={20} x={10} y={10}>
        §7Loading...
      </Text>
    </Panel>
  );
}

