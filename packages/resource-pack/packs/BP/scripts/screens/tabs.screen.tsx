/** @jsxImportSource @bedrock-core/ui */
import type { JSX } from '@bedrock-core/ui';
import { Panel, Tabs, Text } from '@bedrock-core/ui';

/**
 * A COMPILED screen with client-only tabs.
 *
 * MEASURED (spike S4): switching a radio toggle group reaches script not at
 * all. So pressing a tab here sends nothing, re-presents nothing, and costs
 * nothing — the whole pane swap happens on the client.
 *
 * The trade is that every pane is in the tree at once, so three tabs draw three
 * times the controls. On a compiled screen that is paid in pack size and
 * nothing at runtime, which is why `<Tabs>` is refused on a serialized screen:
 * there the same shape would cost three times the payload on every open.
 *
 * Nothing here can observe which tab is open — no handler runs on a switch.
 * A pane whose content depends on the switch is a screen change, not a tab.
 *
 * The faces are the pack's OWN textures rather than vanilla names. Two rounds
 * of this demo drew blank tabs because a guessed vanilla path did not exist,
 * and a missing texture is simply nothing — it does not warn.
 */
export default function TabsDemo(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={8} gap={6}>
      <Text>{'§fCLIENT-ONLY TABS'}</Text>

      <Tabs width={240} height={120} tabHeight={18}>
        <Tabs.Tab
          label={'One'}
          background={'textures/ui/ore-styled/button/secondary/background'}
          backgroundSelected={'textures/ui/ore-styled/button/primary/background'}
        >
          <Panel flexDirection={'column'} padding={6} gap={4}>
            <Text>{'§aFirst pane'}</Text>
            <Text>{'Nothing reached the server to show this.'}</Text>
          </Panel>
        </Tabs.Tab>

        <Tabs.Tab
          label={'Two'}
          background={'textures/ui/ore-styled/button/secondary/background'}
          backgroundSelected={'textures/ui/ore-styled/button/primary/background'}
        >
          <Panel flexDirection={'column'} padding={6} gap={4}>
            <Text>{'§bSecond pane'}</Text>
            <Text>{'Still nothing.'}</Text>
          </Panel>
        </Tabs.Tab>

        <Tabs.Tab
          label={'Three'}
          background={'textures/ui/ore-styled/button/secondary/background'}
          backgroundSelected={'textures/ui/ore-styled/button/primary/background'}
        >
          <Panel flexDirection={'column'} padding={6} gap={4}>
            <Text>{'§eThird pane'}</Text>
            <Text>{'All three were baked into the pack.'}</Text>
          </Panel>
        </Tabs.Tab>
      </Tabs>
    </Panel>
  );
}
