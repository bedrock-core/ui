import type { JSX, TranslationResolver } from '@bedrock-core/ui-runtime';
import {
  Background, Button, Container, Hotbar, Image, Panel, PlayerInventory, Slot, Text, TranslationContext,
  usePlayer, useState,
} from '@bedrock-core/ui-runtime';
import {
  allocate, buildContainerTree, ContainerScreenError, KEY_PREFIX, MAX_LAYOUT,
} from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { compileScreen } from '../compile';
import { child, definition, defs, find, findAll } from '../__fixtures__/helpers';

/** Knows one key, so the build can tell a key from a literal. */
const resolver: TranslationResolver = key => (key === 'core.demo.subtitle' ? 'Subtitle' : undefined);

/** Expanded under the provider, so its key resolves. */
const Subtitle = (): JSX.Element => Text({ children: 'core.demo.subtitle' });

/**
 * Every library component a container screen can be made of, in one screen.
 *
 * This is the test that would have caught every mistake a hand-written target
 * surfaced in game, which is why it exists at the seam rather than inside any
 * one phase.
 */
const Demo = (): JSX.Element => Container({
  entity: 'core:demo',
  background: 'textures/ui/dialog_background_opaque',
  padding: 7,
  gap: 4,
  children: [
    Background({ texture: 'textures/ui/demo_backdrop' }),
    Text({ shadow: true, font: 'minecraftTen', children: '§fBEDROCK CORE' }),
    // A lazy element, so the label expands inside the provider and reads it.
    TranslationContext({ value: resolver, children: { type: Subtitle, props: {} } }),
    Text({ maxLength: 8, children: 'idle' }),
    Panel({
      children: [
        Image({ texture: 'textures/ui/brewing_fuel_bar_empty', width: 100, height: 6 }),
      ],
    }),
    Panel({
      flexDirection: 'row',
      gap: 4,
      children: [
        Button({ onPress: () => undefined, children: Text({ children: '+' }) }),
        Button({
          background: 'textures/ui/dark',
          backgroundLocked: 'textures/ui/dark_off',
          enabled: false,
          children: Text({ children: '-' }),
        }),
      ],
    }),
    Panel({
      flexDirection: 'row',
      gap: 4,
      children: [Slot({ interactive: false }), Slot({}), Slot({})],
    }),
    PlayerInventory({}),
    Hotbar({}),
  ],
});

describe('the compiler, end to end', () => {
  const compiled = compileScreen(Demo, { name: 'demo', layoutId: 1 });
  const { document } = compiled;

  it('names the screen, its namespace and its entity', () => {
    expect(compiled).toMatchObject({
      name: 'demo',
      namespace: 'core_ui_demo',
      layoutId: 1,
      entity: 'core:demo',
      hasBackdrop: true,
      hasText: true,
    });
    expect(document.namespace).toBe('core_ui_demo');
  });

  it('emits the screen at the canvas width', () => {
    const screen = definition(document, 'screen');

    expect(screen.size?.[0]).toBe(320);
    expect(screen.size?.[1]).toBeLessThanOrEqual(210);
    expect(child(screen, 'bg').texture).toBe('textures/ui/dialog_background_opaque');
  });

  it('bakes the static label\'s actual string', () => {
    const [, title] = find(document, name => name === 'label_1');

    expect(title).toMatchObject({
      type: 'label',
      text: '§fBEDROCK CORE',
      localize: false,
      shadow: true,
      font_type: 'MinecraftTen',
      font_size: 'small',
      font_scale_factor: 2,
    });
    expect(JSON.stringify(document)).toContain('§fBEDROCK CORE');
  });

  it('localizes a label the build recognised as a key', () => {
    const [, subtitle] = find(document, name => name === 'label_2');

    expect(subtitle).toMatchObject({ type: 'label', text: 'core.demo.subtitle', localize: true });
  });

  it('bakes the button\'s child label into its face', () => {
    const plus = definition(document, 'button_1_face');

    expect(child(child(plus, 'content'), 'label_3')).toMatchObject({ type: 'label', text: '+', localize: false });
    expect(child(plus, 'bg').texture).toBe('textures/ui/unstyled');

    const minus = definition(document, 'button_2_face');

    // `<Text>` guards a dash-leading literal with a zero-width `§r`, which a
    // JSON UI label renders as nothing; the guard is kept, not stripped.
    expect(child(child(minus, 'content'), 'label_4')).toMatchObject({ type: 'label', text: '§r-' });
    expect(child(minus, 'bg').texture).toBe('textures/ui/dark');
    expect(child(minus, 'bg_disabled').texture).toBe('textures/ui/dark_off');
  });

  it('hands out the slot indices the runtime will read', () => {
    const allocation = allocate(buildContainerTree(Demo));
    const indices = findAll(document, name => name.includes('@core_ui_demo.slot_host'))
      .map(([, control]) => control.$slot);

    expect(indices).toEqual(allocation.slots.map(entry => entry.slot));
    expect(indices).toEqual([1, 2, 3, 4, 5]);

    const [, locked] = find(document, name => name.startsWith('slot_1@'));

    expect(locked.$cell).toBe('core_ui_demo.locked_slot');
  });

  it('hands out the channel indices the runtime will write', () => {
    const allocation = allocate(buildContainerTree(Demo));
    const [run] = allocation.channels;

    expect(run).toMatchObject({ carrier: 'text', length: 8 });

    const cells = findAll(document, name => name.startsWith('glyph@')).map(([, control]) => control.collection_index);

    expect(cells).toEqual(Array.from({ length: 8 }, (_unused, cell) => (run?.slot ?? 0) + cell));

    expect(compiled.allocation).toEqual({ sentinel: 0, drawn: 5, channels: 8, size: 14 });
  });

  it('decodes text through the shared character table', () => {
    const [name] = Object.keys(defs(document)).filter(key => key.startsWith('text_channel'));

    expect(name).toBeDefined();
    expect(definition(document, name ?? '').bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `('${KEY_PREFIX}' + #channel_raw)`,
      target_property_name: '#channel_text',
    });
  });

  it('lifts the backdrop out of the canvas', () => {
    expect(definition(document, 'backdrop')).toEqual({
      type: 'image',
      texture: 'textures/ui/demo_backdrop',
      size: ['100%', '100%'],
      keep_ratio: false,
    });
    expect(JSON.stringify(definition(document, 'screen'))).not.toContain('demo_backdrop');
  });

  it('places the player\'s grids where the author put them', () => {
    const [, inventory] = find(document, name => name === 'grid_1');
    const [, hotbar] = find(document, name => name === 'grid_2');

    expect(inventory).toMatchObject({ type: 'grid', size: [162, 54], grid_dimensions: [9, 3], collection_name: 'inventory_items' });
    expect(hotbar).toMatchObject({ type: 'grid', size: [162, 18], grid_dimensions: [9, 1], collection_name: 'hotbar_items' });
    expect(inventory.anchor_from).toBe('top_left');
  });

  it('never mints a bcui name', () => {
    expect(JSON.stringify(document)).not.toContain('bcui');
  });

  it('round-trips through JSON unchanged', () => {
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });

  it('builds the layout from a hook\'s INITIAL value', () => {
    const Stateful = (): JSX.Element => {
      const [label] = useState('start');

      return Text({ children: label });
    };

    const Screen = (): JSX.Element => Container({ entity: 'core:state', children: [{ type: Stateful, props: {} }] });
    const [, label] = find(compileScreen(Screen, { name: 'state', layoutId: 2 }).document, name => name === 'label_1');

    expect(label.text).toBe('start');
  });

  it('still rejects a hook that needs a player, because there is not one', () => {
    const PerPlayer = (): JSX.Element => {
      usePlayer();

      return Text({ children: 'never gets here' });
    };

    const Screen = (): JSX.Element => Container({ entity: 'core:player', children: [{ type: PerPlayer, props: {} }] });

    expect(() => compileScreen(Screen, { name: 'player', layoutId: 3 })).toThrow();
  });

  it('reports a screen with nothing live as sentinel-only', () => {
    const Static = (): JSX.Element => Container({ entity: 'core:static', children: [Text({ children: 'title' })] });
    const result = compileScreen(Static, { name: 'static', layoutId: 4 });

    expect(result.allocation).toEqual({ sentinel: 0, drawn: 0, channels: 0, size: 1 });
    expect(result.hasText).toBe(false);
    expect(result.hasBackdrop).toBe(false);
    expect(Object.keys(defs(result.document))).toEqual(['screen']);
  });

  describe('the spec', () => {
    const Screen = (): JSX.Element => Container({ entity: 'core:spec', children: [] });

    it('rejects a layout id outside the sentinel\'s range', () => {
      expect(() => compileScreen(Screen, { name: 'spec', layoutId: 0 })).toThrow(ContainerScreenError);
      expect(() => compileScreen(Screen, { name: 'spec', layoutId: MAX_LAYOUT + 1 })).toThrow(ContainerScreenError);
      expect(() => compileScreen(Screen, { name: 'spec', layoutId: 1.5 })).toThrow(ContainerScreenError);
      expect(() => compileScreen(Screen, { name: 'spec', layoutId: MAX_LAYOUT })).not.toThrow();
    });

    it('rejects a name that cannot be a namespace', () => {
      expect(() => compileScreen(Screen, { name: 'my.screen', layoutId: 1 })).toThrow(ContainerScreenError);
      expect(() => compileScreen(Screen, { name: '', layoutId: 1 })).toThrow(ContainerScreenError);
      expect(compileScreen(Screen, { name: 'my-screen_2', layoutId: 1 }).namespace).toBe('core_ui_my-screen_2');
    });

    it('rejects a screen without a container', () => {
      const Bare = (): JSX.Element => Panel({ children: [Text({ children: 'x' })] });

      expect(() => compileScreen(Bare, { name: 'bare', layoutId: 1 })).toThrow(ContainerScreenError);
    });
  });
});
