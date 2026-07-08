import { FunctionComponent, JSX } from '../jsx';

/**
 * The host `type` string emitted by {@link Background}. Registered transparent, so
 * the layout / inherit / serialize passes walk straight through it (it has no
 * children and no box); the presenters find it on the built tree and encode its
 * texture into the form-title metadata.
 */
export const BACKGROUND_SLOT_TYPE = 'background';

export interface BackgroundProps {
  /**
   * RP texture path drawn as the full-screen backdrop behind the form, e.g.
   * `"textures/ui/my_background"`. Must fit the title's 80-byte string field and,
   * like all title strings, may not contain `;` (the pad character).
   */
  texture: string;
}

/**
 * Full-screen backdrop for a form. Place one anywhere in the tree (conventionally
 * first, at the root); it occupies no layout space and renders behind all form
 * content, covering the whole screen. Works on both backends — an ActionForm tree
 * and inside a `<Form>` modal.
 *
 * The texture rides the title metadata: one extra field at a FIXED offset (the
 * serializer pads the title with reserved bytes so the offset is identical on both
 * backends and for any scroll count), decoded RP-side by the single static
 * `core_ui_common.form_background`. Only the first `<Background>` in a tree wins.
 *
 * ```tsx
 * render(
 *   <>
 *     <Background texture="textures/ui/my_background" />
 *     <Text>Hello</Text>
 *   </>,
 *   player,
 * );
 * ```
 */
export const Background: FunctionComponent<BackgroundProps> = ({ texture }: BackgroundProps): JSX.Element => ({
  type: BACKGROUND_SLOT_TYPE,
  props: { __background: texture },
});
