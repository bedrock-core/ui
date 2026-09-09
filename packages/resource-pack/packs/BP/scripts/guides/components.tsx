/** @jsxImportSource @bedrock-core/ui */
import type { GuideComponents } from '@bedrock-core/guides';
import { Button } from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui';

interface GuideDemoButtonProps {
  label?: string;
}

/**
 * The one `cmp` block this addon's guide pages use: `<GuideDemoButton />` in
 * an .mdx page renders this button. It is static — a press sends nothing.
 */
function GuideDemoButton({ label }: GuideDemoButtonProps): JSX.Element {
  return (
    <Button variant={'contrast'} onPress={(): void => undefined}>
      {`§d${label ?? 'JSX inside MDX'}`}
    </Button>
  );
}

/**
 * The `cmp` blocks this addon's guide pages may use. The guides filter's
 * generated screen modules import this registry, so the compiled pages bake
 * the same components (config.json names this module).
 */
const guideComponents: GuideComponents = { GuideDemoButton };

export default guideComponents;
