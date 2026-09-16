import type { JSX, TranslationResolver } from '@bedrock-core/ui-runtime';
import {
  Background, Button, Container, Hotbar, Image, Panel, PlayerInventory, Screen as ScreenRoot, Slot, Text, TranslationContext,
  usePlayer, useState,
} from '@bedrock-core/ui-runtime';
import {
  allocate, buildContainerTree, ContainerScreenError, KEY_PREFIX, layoutKey, MAX_LAYOUT, ScreenRootError,
} from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { compileScreen } from '../compile';
import { child, definition, defs, drawnFace, find, findAll, names } from '../__fixtures__/helpers';

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
  const compiled = compileScreen(Demo, { name: 'demo' });
  const { document, faces } = compiled;

  it('names the screen, its namespace and its host', () => {
    expect(compiled).toMatchObject({
      name: 'demo',
      addon: 'core_ui',
      namespace: 'core_ui_demo',
      layoutId: layoutKey('core_ui', 'demo'),
      host: { kind: 'entity', type: 'core:demo' },
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

  it('bakes the button\'s child label into its shared face', () => {
    // The faces are the addon's, named by their look; each button's mechanism
    // on the chest references them.
    const faceOf = (mechanism: string): { rest: string; disabled: string } => {
      const cell = definition(document, mechanism);
      const [enabled, disabled] = cell.controls ?? [];
      const rest = String(enabled?.['enabled']?.controls?.[0]?.['item@core_ui_chest.cell']?.$background_images).replace('core_ui_faces.', '');
      const off = Object.keys(disabled?.['disabled']?.controls?.[0] ?? {})[0]?.replace('face@core_ui_faces.', '') ?? '';

      return { rest, disabled: off };
    };

    const plus = faceOf('press_1');
    const plusFace = drawnFace(faces, plus.rest);
    const plusContent = faces[`${plus.rest}_content`] ?? {};

    expect(child(plusContent, 'c0')).toMatchObject({ type: 'label', text: '+', localize: false });
    expect(child(plusFace, 'bg').texture).toBe('textures/ui/unstyled');
    expect(plus.disabled).toBe(plus.rest);

    const minus = faceOf('press_2');

    // `<Text>` guards a dash-leading literal with a zero-width `§r`, which a
    // JSON UI label renders as nothing; the guard is kept, not stripped.
    expect(child(faces[`${minus.rest}_content`] ?? {}, 'c0')).toMatchObject({ type: 'label', text: '§r-' });
    expect(child(drawnFace(faces, minus.rest), 'bg').texture).toBe('textures/ui/dark');
    expect(minus.disabled).toBe(`${minus.rest}_disabled`);
    expect(child(drawnFace(faces, minus.disabled), 'bg').texture).toBe('textures/ui/dark_off');
  });

  it('hands out the slot indices the runtime will read', () => {
    const allocation = allocate(buildContainerTree(Demo));
    const indices = findAll(document, name => name.includes('@core_ui_chest.slot_host'))
      .map(([, control]) => control.$slot);

    expect(indices).toEqual(allocation.slots.map(entry => entry.slot));
    expect(indices).toEqual([2, 3, 4, 5, 6]);

    const [, locked] = find(document, name => name.startsWith('slot_1@'));

    expect(locked.$cell).toBe('core_ui_chest.locked_slot');
  });

  it('hands out the channel indices the runtime will write', () => {
    const allocation = allocate(buildContainerTree(Demo));
    const [run] = allocation.channels;

    expect(run).toMatchObject({ carrier: 'text', length: 8 });

    const cells = findAll(document, name => name.startsWith('glyph@')).map(([, control]) => control.collection_index);

    expect(cells).toEqual(Array.from({ length: 8 }, (_unused, cell) => (run?.slot ?? 0) + cell));

    expect(compiled.allocation).toEqual({ sentinels: 2, drawn: 5, channels: 8, size: 15 });
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

  it('refuses baked text a state change would move, naming the maxLength it needs', () => {
    // The build probes each state slot: this label reads one, so it would be
    // written into JSON UI once and show 'start' whatever the screen did next.
    const Stateful = (): JSX.Element => {
      const [label] = useState('start');

      return Text({ children: label });
    };

    const Screen = (): JSX.Element => Container({ entity: 'core:state', children: [{ type: Stateful, props: {} }] });

    expect(() => compileScreen(Screen, { name: 'state' })).toThrow(/maxLength/);
  });

  it('builds the layout from a hook\'s INITIAL value', () => {
    const Stateful = (): JSX.Element => {
      const [label] = useState('start');

      return Text({ maxLength: 8, children: label });
    };

    const Screen = (): JSX.Element => Container({ entity: 'core:state', children: [{ type: Stateful, props: {} }] });
    const compiled = compileScreen(Screen, { name: 'state' });

    // The run reserves what the author declared, not what the initial value
    // happens to be — the build renders with 'start' but sizes for 8.
    expect(compiled.hasText).toBe(true);
    expect(compiled.allocation.channels).toBe(8);
  });

  it('refuses a container that names no host, since nothing could serve it', () => {
    const Screen = (): JSX.Element => Container({ entity: '', children: [] });

    expect(() => compileScreen(Screen, { name: 'nameless' })).toThrow(/needs `entity` or `block`/);
  });

  it('refuses a container that names both an entity and a block', () => {
    const Screen = (): JSX.Element => Container({ entity: 'core:both', block: 'core:both', children: [] });

    expect(() => compileScreen(Screen, { name: 'both' })).toThrow(/names both an entity/);
  });

  it('names the block a block-hosted screen opens from, and sizes it against the block cap', () => {
    const Block = (): JSX.Element => Container({ block: 'core:workbench', children: [Text({ children: 'shop' })] });

    expect(compileScreen(Block, { name: 'workbench' }).host).toEqual({ kind: 'block', type: 'core:workbench' });

    // 54 slots is the whole allocation, sentinel and bank included: a live
    // string costs one slot per character, so this one cannot be a block's.
    const Wide = (): JSX.Element => Container({
      block: 'core:wide',
      children: [Text({ maxLength: 60, children: 'x' })],
    });

    expect(() => compileScreen(Wide, { name: 'wide' })).toThrow(/a block holds 54/);
    expect(() => compileScreen(Wide, { name: 'wide' })).toThrow(/host the[\s\S]*screen on an entity/);
  });

  it('still rejects a hook that needs a player, because there is not one', () => {
    const PerPlayer = (): JSX.Element => {
      usePlayer();

      return Text({ children: 'never gets here' });
    };

    const Screen = (): JSX.Element => Container({ entity: 'core:player', children: [{ type: PerPlayer, props: {} }] });

    expect(() => compileScreen(Screen, { name: 'player' })).toThrow();
  });

  it('reports a screen with nothing live as sentinel-only', () => {
    const Static = (): JSX.Element => Container({ entity: 'core:static', children: [Text({ children: 'title' })] });
    const result = compileScreen(Static, { name: 'static' });

    expect(result.allocation).toEqual({ sentinels: 2, drawn: 0, channels: 0, size: 2 });
    expect(result.hasText).toBe(false);
    expect(result.hasBackdrop).toBe(false);
    expect(Object.keys(defs(result.document))).toEqual(['screen']);
  });

  describe('the spec', () => {
    const Screen = (): JSX.Element => Container({ entity: 'core:spec', children: [] });

    it('keys the layout by its full name, the same on every build and apart from other addons\'', () => {
      const key = compileScreen(Screen, { name: 'spec' }).layoutId;

      expect(key).toBe(layoutKey('core_ui', 'spec'));
      expect(key).toBeGreaterThanOrEqual(1);
      expect(key).toBeLessThanOrEqual(MAX_LAYOUT);
      expect(compileScreen(Screen, { name: 'spec' }).layoutId).toBe(key);
      expect(compileScreen(Screen, { name: 'spec', namespace: 'drav0011_shop' }).layoutId).not.toBe(key);
    });

    it('rejects a name that cannot be a namespace', () => {
      expect(() => compileScreen(Screen, { name: 'my.screen' })).toThrow(ContainerScreenError);
      expect(() => compileScreen(Screen, { name: '' })).toThrow(ContainerScreenError);
      expect(compileScreen(Screen, { name: 'my-screen_2' }).namespace).toBe('core_ui_my-screen_2');
    });

    it('rejects a screen without a container: a form root by name, no root by the list of roots', () => {
      const Bare = (): JSX.Element => Panel({ children: [Text({ children: 'x' })] });
      const AForm = (): JSX.Element => ScreenRoot({ children: Panel({ children: [Text({ children: 'x' })] }) });

      expect(() => compileScreen(Bare, { name: 'bare' })).toThrow(ScreenRootError);
      expect(() => compileScreen(AForm, { name: 'form' })).toThrow(ContainerScreenError);
      expect(() => compileScreen(AForm, { name: 'form' })).toThrow(/exactly one `<Container>`/);
    });
  });
});

describe('the face pass', () => {
  const compiled = compileScreen(Demo, { name: 'demo' });
  const { face } = compiled;

  it('draws the screen complete and static, with no binding that reads a host', () => {
    expect(face.document.namespace).toBe('core_ui_demo');
    expect(JSON.stringify(face.document)).not.toContain('binding');
  });

  it('draws the same shared faces the screen draws', () => {
    const referenced = new Set([...JSON.stringify(face.document).matchAll(/core_ui_faces\.([A-Za-z0-9_]+)/g)].map(match => match[1]));

    for (const id of referenced) {
      expect(names(compiled.faces)).toContain(id);
    }
  });
});
