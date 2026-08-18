/** @jsxImportSource @bedrock-core/ui-runtime */
import { Form, theme } from '@bedrock-core/ore-styled';
import { Panel, Text, type JSX } from '@bedrock-core/ui-runtime';

const header = theme.components.header;

/**
 * The header bar for a native modal screen, with the back control in the same left slot every
 * other screen puts it in.
 *
 * A modal form may not contain a plain `Button` — the runtime rejects it, since the native
 * modal's only controls are its own submit and dismiss. `Form.Button` is not a plain button
 * though: it is laid out like any other row and the presenter encodes its computed geometry
 * into the form title, so it can sit ANYWHERE in the tree. Putting the `exit` one here is what
 * lets back live in the header rather than stranded at the bottom of the form.
 *
 * It is icon-only (empty label, the header's own back textures), so it is the same control the
 * navigable screens wear. The right slot stays an empty spacer: a form may declare at most one
 * `exit`, so there is no second dismiss to put there, and the slot keeps the title centred.
 */
export function FormHeader({ title, back = false }: { title: string; back?: boolean }): JSX.Element {
  return (
    <Panel
      flexDirection={'row'}
      alignItems={'center'}
      gap={header.gap}
      padding={header.padding}
      // Same 1px inset the `Header` uses: it lets the enclosing card's border draw around the
      // bar instead of the bar running flush to the window edge with no frame.
      marginTop={1}
      marginLeft={1}
      marginRight={1}
      background={header.textures.background}
    >
      {back
        ? (
            <Form.Button
              type={'exit'}
              label={''}
              width={header.iconSize}
              height={header.iconSize}
              background={header.textures.back}
              backgroundHover={header.textures.backHover}
              backgroundPressed={header.textures.backPressed}
            />
          )
        : <Panel width={header.iconSize} height={header.iconSize} />}
      <Panel flexGrow={1} flexShrink={1} justifyContent={'center'} alignItems={'center'}>
        <Text font={header.textStyle.font} scale={header.textStyle.scale} maxLines={1} overflow={'ellipsis'}>
          {`${header.textStyle.color}${title}`}
        </Text>
      </Panel>
      <Panel width={header.iconSize} height={header.iconSize} />
    </Panel>
  );
}
