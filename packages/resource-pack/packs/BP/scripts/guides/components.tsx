/** @jsxImportSource @bedrock-core/ui */
import type { GuideComponents } from '@bedrock-core/guides';
import { theme } from '@bedrock-core/ore-styled';
import { Panel, Text, type JSX } from '@bedrock-core/ui';

interface GuideDemoButtonProps {
  label?: string;
}

/**
 * The one `cmp` block this addon's guide pages use: `<GuideDemoButton />` in an
 * .mdx page renders this.
 *
 * It LOOKS like a button and takes no press, which is the rule for anything a
 * guide draws: a guide page is shown from what the build knew about it, so a
 * press that runs script would make the page need its component at runtime —
 * and would do nothing at all on a realm showing this guide from its reference.
 * Somewhere to go is a `<Link>`; anything else is decoration.
 */
function GuideDemoButton({ label }: GuideDemoButtonProps): JSX.Element {
  const { textures, padding } = theme.components.button.variants.contrast.textures === undefined
    ? { textures: undefined, padding: undefined }
    : { textures: theme.components.button.variants.contrast.textures, padding: theme.components.button.padding };

  return (
    <Panel
      background={textures?.default}
      paddingLeft={padding?.x ?? 0}
      paddingRight={padding?.x ?? 0}
      paddingTop={padding?.y ?? 0}
      paddingBottom={padding?.y ?? 0}
      justifyContent={'center'}
      alignItems={'center'}
    >
      <Text>{`§d${label ?? 'JSX inside MDX'}`}</Text>
    </Panel>
  );
}

/**
 * The `cmp` blocks this addon's guide pages may use. The guides filter's
 * generated screen modules import this registry, so the compiled pages bake
 * the same components (config.json names this module).
 */
const guideComponents: GuideComponents = { GuideDemoButton };

export default guideComponents;
