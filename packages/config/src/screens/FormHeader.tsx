/** @jsxImportSource @bedrock-core/ui-runtime */
import { theme } from '@bedrock-core/ore-styled';
import { Panel, Text, type JSX } from '@bedrock-core/ui-runtime';

const header = theme.components.header;

/**
 * The header bar for a native modal screen — the ore `Header` minus its buttons.
 *
 * A modal form may not contain a `Button` (the runtime rejects it: the native modal's only
 * controls are its own submit and dismiss), so the back and close affordances cannot live up
 * here the way they do on every other screen. The bar itself still can, and without it a config
 * form was the one screen in the stack with no chrome at all — a title floating on the vanilla
 * dialog background. Back is surfaced as the form's dismiss button instead.
 */
export function FormHeader({ title }: { title: string }): JSX.Element {
  return (
    <Panel
      flexDirection={'row'}
      alignItems={'center'}
      justifyContent={'center'}
      padding={header.padding}
      // Same 1px inset the `Header` uses: it lets the enclosing card's border draw around the
      // bar instead of the bar running flush to the window edge with no frame.
      marginTop={1}
      marginLeft={1}
      marginRight={1}
      background={header.textures.background}
    >
      <Text font={header.textStyle.font} scale={header.textStyle.scale} maxLines={1} overflow={'ellipsis'}>
        {`${header.textStyle.color}${title}`}
      </Text>
    </Panel>
  );
}
