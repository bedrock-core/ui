import { JSX } from '..';
import { Image, Panel, Text } from '../..';

/**
 * Dev version - logs the component tree without needing a Player
 */
export function Example(): JSX.Element {
  return (
    <Panel width={384} height={256} x={48} y={48}>
      <Panel
        width={320}
        height={32}
        x={32}
        y={24}>
        <Text
          width={320}
          height={24}
          x={32}
          y={74}
          value="Here's a quick overview of your realm:"
        />
      </Panel>

      <Text
        width={320}
        height={24}
        x={32}
        y={74}
        value="Here's a quick overview of your realm:"
      />

      <Image
        width={160}
        height={90}
        x={32}
        y={110}
        texture="textures/ui/core-ui/components/panel/light/background"
      />
    </Panel>
  );
}
