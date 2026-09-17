/** @jsxImportSource @bedrock-core/ui-runtime */
import type { DisplayText } from '@bedrock-core/i18n';
import type { JSX } from '@bedrock-core/ui-runtime';
import { Panel, Tabs as PrimitiveTabs, Text } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';

export interface TabProps {
  /** The tab's name, on its header. */
  label: DisplayText;
  /** The pane shown while the tab is chosen. */
  children?: JSX.Node;
}

/** A header's caption, centred, in its state's colour, the chosen one dropped a step. */
const header = (label: DisplayText, chosen: boolean): JSX.Element => {
  const t = theme.components.tabs;
  const ts = t.textStyle;

  return (
    <Panel
      width={'100%'}
      height={'100%'}
      justifyContent={'center'}
      alignItems={'center'}
      paddingLeft={t.paddingX}
      paddingRight={t.paddingX}
      // Centred, so padding the top by twice the drop moves the caption down by the drop.
      paddingTop={chosen ? t.selectedDrop * 2 : 0}
    >
      <Text font={ts.font} scale={ts.scale} color={chosen ? ts.selected : ts.unselected}>{label}</Text>
    </Panel>
  );
};

/**
 * One tab: a label on the theme's header faces, and its pane.
 *
 * It stands for the primitive tab it builds, which is what its `<Tabs>` reads —
 * so it belongs inside the styled `<Tabs>`, and the header's look is the
 * theme's rather than the author's.
 */
export function Tab({ label, children }: TabProps): JSX.Element {
  return PrimitiveTabs.Tab({ header: header(label, false), headerSelected: header(label, true), children });
}
