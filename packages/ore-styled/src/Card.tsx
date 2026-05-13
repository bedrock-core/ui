import { Fragment, Image, Panel, Text } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';

import { SPACING, TEXTURES } from './tokens';

export interface CardProps extends ControlProps {
  image?: string;
  title: string;
  description?: string;
  background?: string;
  children?: JSX.Node;
}

export function Card({
  image,
  title,
  description,
  background = TEXTURES.card.background,
  children,
  ...layout
}: CardProps): JSX.Element {
  return (
    <Panel flexDirection={'column'} background={background} {...layout}>
      <Fragment>
        <Image texture={image ?? ''} visible={image !== undefined} />
        <Panel flexDirection={'column'} padding={SPACING.md} gap={SPACING.xs}>
          <Fragment>
            <Text>{title}</Text>
            <Text visible={description !== undefined}>{description ?? ''}</Text>
          </Fragment>
        </Panel>
        <Panel>{children}</Panel>
      </Fragment>
    </Panel>
  );
}
