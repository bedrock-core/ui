import { beforeAll, describe, expect, it } from 'vitest';
import { registerNativeComponents } from '../../components';
import { withControl } from '../../components/control';
import { Image } from '../../components/Image';
import { Text } from '../../components/Text';
import type { JSX } from '../../jsx';

beforeAll(() => {
  registerNativeComponents();
});

/**
 * The font every control carries.
 *
 * The label the render pack mounts is the same control whatever the cell
 * actually is, so it reads `font_type` off any of them. A cell that carried no
 * font — or carried something that was not an alias, such as an image's texture
 * — made the engine log "Could not find font alias <path>" to NonAssertErrorLog,
 * which blocks a Marketplace submission. So every control has one, and it is
 * always a real alias.
 */
const fontOf = (node: JSX.Element): unknown => node.props['fontType'];

describe('the font every control carries', () => {
  it('is a text cell\'s own', () => {
    expect(fontOf(Text({ font: 'minecraftTen', children: 'Hi' }))).toBe('MinecraftTen');
  });

  it('is a valid alias on a cell that has no text at all', () => {
    expect(fontOf(Image({ texture: 'textures/blocks/diamond_ore' }))).toBe('default');
    expect(withControl({ background: 'textures/ui/unstyled' })['fontType']).toBe('default');
  });

  it('is never a texture path', () => {
    for (const node of [
      Image({ texture: 'textures/ui/ore-styled/divider/horizontal/default' }),
      Image({ texture: 'textures/ui/ore-styled/dropdown/arrow' }),
      Image({}),
    ]) {
      expect(String(fontOf(node))).not.toContain('textures/');
    }
  });
});
