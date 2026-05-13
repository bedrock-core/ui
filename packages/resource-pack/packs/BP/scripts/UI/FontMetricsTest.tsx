import { Fragment, JSX, Panel, Text } from '@bedrock-core/ui';
import type { TextFont } from '@bedrock-core/ui/components/Text';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DIGITS = '(0123456789)';
const PUNCT = '!@#$%&*()_+-=[]{}|;:\'",.<>/?';
const NARROW = 'iIlL1.,;:!|';

function Rows({ prefix, font, scale }: { prefix: string; font: TextFont; scale?: number }): JSX.Element {
  return (
    <Fragment>
      <Text font={font} scale={scale}>{`${prefix}${ALPHA}`}</Text>
      <Text font={font} scale={scale}>{`${prefix}${DIGITS}`}</Text>
      <Text font={font} scale={scale}>{`${prefix}${PUNCT}`}</Text>
      <Text font={font} scale={scale}>{`${prefix}${NARROW}`}</Text>
    </Fragment>
  );
}

function MojanglesSection(): JSX.Element {
  const font: TextFont = 'mojangles';

  return (
    <Fragment>
      <Text>{`§e§l=== mojangles ===`}</Text>

      <Text>{'§7normal'}</Text>
      <Rows font={font} prefix={''} />

      <Text>{'§7bold'}</Text>
      <Rows font={font} prefix={'§l'} />

      <Text>{'§7italic'}</Text>
      <Rows font={font} prefix={'§o'} />

      <Text>{'§7bold+italic'}</Text>
      <Rows font={font} prefix={'§l§o'} />

      <Text>{'§7scale 2.0'}</Text>
      <Text font={font} scale={2.0}>{ALPHA}</Text>
      <Text font={font} scale={2.0}>{DIGITS}</Text>

      <Text>{'§7scale 2.0 bold'}</Text>
      <Text font={font} scale={2.0}>{`§l${ALPHA}`}</Text>
      <Text font={font} scale={2.0}>{`§l${DIGITS}`}</Text>

      <Text>{'§7scale 4.0'}</Text>
      <Text font={font} scale={4.0}>{ALPHA}</Text>
      <Text font={font} scale={4.0}>{DIGITS}</Text>
    </Fragment>
  );
}

export function FontMetricsTest(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={4} padding={4}>
      <MojanglesSection />
    </Panel>
  );
}
