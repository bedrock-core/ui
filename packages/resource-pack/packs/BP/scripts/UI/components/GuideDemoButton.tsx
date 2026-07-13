/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button } from '@bedrock-core/ore-styled';
import { type JSX } from '@bedrock-core/ui';

interface GuideDemoButtonProps {
  label?: string;
}

/**
 * Proof-of-concept `cmp` block: registered via `components` on the guide
 * screens so `<GuideDemoButton />` in an .mdx file renders this instead of
 * the "unsupported content" placeholder. Does nothing on press.
 */
export function GuideDemoButton({ label }: GuideDemoButtonProps): JSX.Element {
  return (
    <Button variant={'contrast'} onPress={(): void => undefined}>
      {`§d${label ?? 'JSX inside MDX'}`}
    </Button>
  );
}
