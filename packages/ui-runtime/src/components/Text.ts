import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

export type TextFont = 'mojangles';

export interface TextStyle {
  font?: TextFont;
}

export interface TextProps extends ControlProps {
  font?: TextFont;

  /**
   * Upward scale multiplier for rendered glyph size (≥ 1.0).
   * Maps to JSON UI font_scale_factor. Values below 1.0 are clamped to 1.0.
   */
  scale?: number;

  /**
   * Text content to display
   * Max 80 characters
   */
  children: string;
}

const FONT_TYPE_MAP: Record<TextFont, string> = {
  mojangles: 'default',
};

export const Text: FunctionComponent<TextProps> = ({
  children,
  font,
  scale,
  ...rest
}: TextProps): JSX.Element => {
  const clampedScale = Math.max(1.0, scale ?? 1.0);

  return {
    type: 'text',
    props: {
      ...withControl(rest),
      value: children ?? '',
      fontType: FONT_TYPE_MAP[font ?? 'mojangles'],
      fontScaleFactor: clampedScale,
      __textMetrics: {
        font,
        fontSize: clampedScale,
      },
    },
  };
};
