/** @jsxImportSource @bedrock-core/ui-runtime */
import { Divider, theme } from '@bedrock-core/ore-styled';
import { Panel, Text, type JSX } from '@bedrock-core/ui-runtime';

const { spacing } = theme.tokens;

/**
 * A group title inside a settings form: the same `minecraftTen` + rule treatment the
 * guide index uses for its categories, so a config screen and a guide screen break
 * their content into sections that look identical.
 */
export function SectionHeading({ label }: { label: string }): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.xs}>
      <Text font={'minecraftTen'} shadow={true} wordBreak={'break-word'}>{label}</Text>
      <Divider variant={'dark'} />
    </Panel>
  );
}
