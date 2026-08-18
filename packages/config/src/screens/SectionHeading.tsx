/** @jsxImportSource @bedrock-core/ui-runtime */
import { Divider, theme } from '@bedrock-core/ore-styled';
import { Panel, Text, type JSX } from '@bedrock-core/ui-runtime';

const { spacing, fontColor } = theme.tokens;

/**
 * A group title inside a settings form: the same `minecraftTen` + rule treatment the
 * guide index uses for its categories, so a config screen and a guide screen break
 * their content into sections that look identical.
 *
 * The rule under the title is the LIGHT divider, one pixel — the heavier default one separates
 * the properties inside the section, so a title reads as opening a section rather than closing
 * the one above it.
 */
export function SectionHeading({ label, description }: { label: string; description?: string }): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.xs}>
      <Text font={'minecraftTen'} shadow={true} wordBreak={'break-word'}>{label}</Text>
      <Divider variant={'light'} />
      {description !== undefined
        ? <Text wordBreak={'break-word'}>{`${fontColor.muted}${description}`}</Text>
        : null}
    </Panel>
  );
}
