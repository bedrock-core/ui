import { beforeAll, describe, expect, it } from 'vitest';
import type { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import type { ActionSerializationContext } from '../types';
import { withControl } from '../../components/control';
import { Image } from '../../components/Image';
import { Text } from '../../components/Text';
import { registerNativeComponents } from '../../components';
import { serialize } from '../serializer';

beforeAll(() => {
  registerNativeComponents();
});

/**
 * The common font slot. The merged label cell mounts for EVERY cell type, so its
 * label decodes the font slot whatever the cell actually is. Reading it from the
 * component-specific region ([1024]) meant an image's texture or a button's
 * backgroundHover reached the engine's `#font_type`, which logs "Could not find
 * font alias <path>" — a Marketplace submission blocker. Every component now
 * carries a valid alias at [606-688], carved from the reserved block so nothing
 * after it moved.
 */
const FONT_SLOT = 606;
const COMPONENT_FIELDS = 1024;

class FakeForm {
  /** Every payload that reached any slot, in walk order. Images route to the
   *  header slot on this backend (see imageWriter); the bytes are the same. */
  readonly payloads: string[] = [];

  button(payload: string): this {
    this.payloads.push(payload);

    return this;
  }

  label(payload: string): this {
    this.payloads.push(payload);

    return this;
  }

  header(payload: string): this {
    this.payloads.push(payload);

    return this;
  }
}

function asForm(form: FakeForm): ActionFormData {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test stub; serialize only calls .button/.label/.header
  return form as unknown as ActionFormData;
}

function ctx(): ActionSerializationContext {
  return { mode: 'action', buttonCallbacks: new Map(), buttonIndex: 0 };
}

function panel(children: JSX.Node, extra: Record<string, unknown> = {}): JSX.Element {
  return { type: 'panel', props: { ...withControl(extra), children } };
}

/** Serialize one element and return the single payload it emitted. */
function payloadOf(node: JSX.Element): string {
  const form = new FakeForm();

  serialize(panel([node]), asForm(form), ctx());

  const [payload] = form.payloads;

  if (payload === undefined) { throw new Error('no payload was emitted'); }

  return payload;
}

describe('common font slot [606-688]', () => {
  it('carries a text cell\'s own font', () => {
    const payload = payloadOf(Text({ font: 'minecraftTen', children: 'Hi' }));

    expect(payload.indexOf('s:MinecraftTen')).toBe(FONT_SLOT);
  });

  it('defaults to a valid alias on an image cell, whose texture tail starts at [1024]', () => {
    const payload = payloadOf(Image({ texture: 'textures/blocks/diamond_ore' }));

    // The exact regression: without the common slot the label read the texture here.
    expect(payload.indexOf('s:default')).toBe(FONT_SLOT);
    // v0008: the texture is the payload TAIL — raw at [1024], no `s:` prefix, no
    // padding, no marker, and nothing after it.
    expect(payload.slice(COMPONENT_FIELDS)).toBe('textures/blocks/diamond_ore');
  });

  it('defaults to a valid alias on a panel cell', () => {
    const payload = payloadOf(panel([], { background: 'textures/ui/unstyled' }));

    expect(payload.indexOf('s:default')).toBe(FONT_SLOT);
  });

  it('never emits a texture path into the font slot', () => {
    for (const node of [
      Image({ texture: 'textures/ui/ore-styled/divider/horizontal/default' }),
      Image({ texture: 'textures/ui/ore-styled/dropdown/arrow' }),
      panel([], { background: 'textures/ui/unstyled' }),
    ]) {
      const slot = payloadOf(node).slice(FONT_SLOT, FONT_SLOT + 83);

      expect(slot.startsWith('s:')).toBe(true);
      expect(slot).not.toContain('textures/');
    }
  });

  it('keeps the label group at [1024] so no later offset moved', () => {
    const payload = payloadOf(Text({ font: 'minecraftTen', children: 'Hi' }));

    // Group slot 1 still holds the font; the cell label just no longer sources it.
    expect(payload.indexOf('s:MinecraftTen', COMPONENT_FIELDS)).toBe(COMPONENT_FIELDS);
  });
});

/**
 * v0008: an image cell is TERMINAL (no children, one component field), so its
 * `texture` rides the payload's variable-length tail exactly like a Text cell's
 * content — appended raw after the 1024-byte control block, unpadded, unprefixed,
 * unmarked and UNCAPPED. That is what lifts the old 80-byte string-field cap on
 * texture paths. The RP decodes it as the whole post-[1024] remainder.
 */
describe('image texture tail [1024→]', () => {
  it('appends the texture verbatim as the tail', () => {
    const payload = payloadOf(Image({ texture: 'textures/ui/ore-styled/dropdown/arrow' }));

    expect(payload.slice(COMPONENT_FIELDS)).toBe('textures/ui/ore-styled/dropdown/arrow');
    expect(payload).toHaveLength(COMPONENT_FIELDS + 'textures/ui/ore-styled/dropdown/arrow'.length);
  });

  it('carries a texture path longer than the old 80-byte cap', () => {
    const long = `textures/ui/${'very-long-directory-segment/'.repeat(5)}icon`;

    expect(long.length).toBeGreaterThan(80);

    // Used to throw SerializationError ("exceeds maximum byte length of 80 bytes").
    const payload = payloadOf(Image({ texture: long }));

    expect(payload.slice(COMPONENT_FIELDS)).toBe(long);
  });

  it('falls back to the unstyled placeholder as the tail', () => {
    const payload = payloadOf(Image({}));

    expect(payload.endsWith('textures/ui/unstyled')).toBe(true);
    expect(payload.slice(COMPONENT_FIELDS)).toBe('textures/ui/unstyled');
  });
});
