import { describe, expect, it } from 'vitest';
import {
  gridFace, listFace, optionParts, panelFace, selectFace, shownWhileOn, sliderFace,
  slotFace, stateFace, swap, textFace, toggleFace,
  type Control, type ControlEntry, type TextStyle,
} from '..';

/**
 * A face is a pure function, so these read like arithmetic: data in, one
 * control out. What is checked is the part a host must not have to know —
 * where the control sits, what it draws, and the measured rules that make it
 * work at all.
 */

const RECT = { x: 10, y: 20, width: 100, height: 30 };
const STYLE: TextStyle = { fontType: 'default', fontScaleFactor: 1 };

/** The one control a face returns, by the name it was given. */
const drawn = (entry: ControlEntry, name: string): Control => {
  const control = entry[name];

  expect(control).toBeDefined();

  return control ?? {};
};

const childrenOf = (control: Control): ControlEntry[] => {
  const { controls } = control;

  return Array.isArray(controls) ? controls : [];
};

describe('where a face sits', () => {
  it('carries its own size and offset, anchored top-left', () => {
    const control = drawn(textFace({ name: 'title', rect: RECT, text: 'Hello', localize: false, ...STYLE }), 'title');

    expect(control.size).toEqual([100, 30]);
    expect(control.offset).toEqual([10, 20]);
    expect(control.anchor_from).toBe('top_left');
    expect(control.anchor_to).toBe('top_left');
  });

  it('says it is hidden only when the author hid it', () => {
    const shown = drawn(panelFace({ name: 'p', rect: RECT, children: [] }), 'p');
    const hidden = drawn(panelFace({ name: 'p', rect: RECT, hidden: true, children: [] }), 'p');

    expect('visible' in shown).toBe(false);
    expect(hidden.visible).toBe(false);
  });
});

describe('a string', () => {
  it('is one face whether the build knows it or script writes it later', () => {
    const baked = drawn(textFace({ name: 't', rect: RECT, text: 'core.title', localize: true, ...STYLE }), 't');
    const live = drawn(textFace({ name: 't', rect: RECT, text: 'Steve', localize: false, ...STYLE }), 't');

    expect(baked.type).toBe('label');
    expect(baked.localize).toBe(true);
    expect(live.localize).toBe(false);
    expect(live.text).toBe('Steve');
  });

  it('is drawn at the small base and scaled from there, the way the render pack draws one', () => {
    const control = drawn(textFace({ name: 't', rect: RECT, text: 'x', localize: false, fontType: 'MinecraftTen', fontScaleFactor: 2 }), 't');

    expect(control.font_size).toBe('small');
    expect(control.font_scale_factor).toBe(2);
    expect(control.font_type).toBe('MinecraftTen');
  });
});

describe('a panel', () => {
  it('puts its children a layer above its background, never beside it', () => {
    const control = drawn(panelFace({
      name: 'card',
      rect: RECT,
      background: 'textures/ui/card',
      children: [{ label: { type: 'label', text: 'x' } }],
    }), 'card');

    const [background, content] = childrenOf(control);

    expect(background?.['bg']?.texture).toBe('textures/ui/card');
    expect(content?.['content']?.layer).toBe(1);
    expect(childrenOf(content?.['content'] ?? {})).toHaveLength(1);
  });

  it('holds its children directly when there is no background to clear', () => {
    const control = drawn(panelFace({ name: 'p', rect: RECT, children: [{ label: { type: 'label' } }] }), 'p');

    expect(childrenOf(control)).toHaveLength(1);
    expect(childrenOf(control)[0]?.['label']).toBeDefined();
  });
});

describe('a button look', () => {
  it('draws its children inside the state, above the texture', () => {
    const parts = childrenOf(stateFace('rest', [{ caption: { type: 'label', text: 'Go' } }]));

    expect(parts[0]?.['bg']?.texture).toBe('rest');
    expect(parts[1]?.['caption']?.layer).toBe(12);
  });

  it('fills whatever placed it, so one look serves every button that wears it', () => {
    const look = stateFace('hover', []);

    expect(look.size).toEqual(['100%', '100%']);
    expect(look.offset).toBeUndefined();
  });
});

describe('a toggle', () => {
  it('is one primitive for every boolean: only the two textures differ', () => {
    const off = drawn(toggleFace({ name: 't', rect: RECT, off: 'off', on: 'on', checked: false }), 't');
    const on = drawn(toggleFace({ name: 't', rect: RECT, off: 'off', on: 'on', checked: true }), 't');

    expect(childrenOf(off)[0]?.['bg']?.texture).toBe('off');
    expect(childrenOf(on)[0]?.['bg']?.texture).toBe('on');
  });
});

describe('a slider', () => {
  it('travels the width less the thumb, so both ends sit flush', () => {
    // Eleven stops, so ten gaps for the thumb to cross.
    const at = (value: number): unknown => {
      const control = drawn(sliderFace({
        name: 's', rect: { ...RECT, width: 116 }, track: 'track', thumb: 'thumb', steps: 11, value,
      }), 's');

      return childrenOf(control)[1]?.['thumb']?.offset;
    };

    expect(at(0)).toEqual([0, 0]);
    expect(at(10)).toEqual([100, 0]);
    expect(at(5)).toEqual([50, 0]);
  });
});

describe('an option', () => {
  it('draws the look it was asked for, out of its four', () => {
    const option = {
      name: 'o',
      rect: { x: 0, y: 0, width: 80, height: 16 },
      background: '', backgroundHover: 'hover', backgroundSelected: 'chosen',
      bullet: 'dot', bulletHover: 'dot_hover', bulletSelected: 'dot_on', bulletSelectedHover: 'dot_on_hover',
      bulletWidth: 8, bulletHeight: 8,
      label: 'First', labelX: 12, labelY: 4, style: STYLE,
    };

    const rest = optionParts(option);
    const chosen = optionParts({ ...option, state: 'selected' });

    expect(rest[0]?.['bullet']?.texture).toBe('dot');
    expect(chosen[0]?.['bg']?.texture).toBe('chosen');
    expect(chosen[1]?.['bullet']?.texture).toBe('dot_on');
  });
});

describe('a list', () => {
  it('is a stack, because only a stack gives a hidden row no space', () => {
    const control = drawn(listFace({
      name: 'rows',
      rect: RECT,
      shown: 2,
      rows: [0, 1, 2].map(index => ({ name: `r${String(index)}`, control: { [`r${String(index)}`]: { type: 'panel' } }, span: 12 })),
    }), 'rows');

    expect(control.type).toBe('stack_panel');
    expect(control.size).toEqual([100, '100%c']);

    const rows = childrenOf(control);

    expect('visible' in (rows[1]?.['r1_row'] ?? {})).toBe(false);
    expect(rows[2]?.['r2_row']?.visible).toBe(false);
  });
});

describe('a grid', () => {
  it('lays its cells at the engine pitch, not the layout\'s', () => {
    const control = drawn(gridFace({ name: 'g', rect: RECT, columns: 3, rows: 2 }), 'g');
    const cells = childrenOf(control);

    expect(cells).toHaveLength(6);
    expect(cells[0]?.['cell_0']?.offset).toEqual([0, 0]);
    expect(cells[4]?.['cell_4']?.offset).toEqual([18, 18]);
  });
});

describe('a slot', () => {
  it('is a frame and nothing else, because the item belongs to a container', () => {
    const control = drawn(slotFace({ name: 'cell', rect: RECT }), 'cell');

    expect(control.type).toBe('image');
    expect(control.texture).toBe('textures/ui/cell_image');
    expect(control.offset).toEqual([10, 20]);
  });
});

describe('the compositions', () => {
  const look = (text: string): Control => ({ type: 'panel', controls: [{ caption: { type: 'label', text } }] });

  it('give a swap all eight states, or a state vanishes on hover', () => {
    const toggle = swap(
      { group: 'core_demo_tabs', index: 0, exclusive: true },
      { on: look('One'), off: look('Two') },
      { size: [80, 20] },
    );

    expect(toggle.type).toBe('toggle');
    expect(childrenOf(toggle)).toHaveLength(8);
    expect(toggle.toggle_name).toBe('core_demo_tabs');
    expect(toggle.radio_toggle_group).toBe(true);
    expect(toggle.toggle_group_forced_index).toBe(0);
    expect(toggle.toggle_on_button).toBe('toggle.toggle_on');
  });

  it('fall a state with no look of its own back to its own resting side', () => {
    const toggle = swap({ group: 'g' }, { on: look('Open'), off: look('Shut') }, {});
    const [checked, checkedHover, , , unchecked] = childrenOf(toggle);

    expect(JSON.stringify(checked?.['checked'])).toContain('Open');
    expect(JSON.stringify(checkedHover?.['checked_hover'])).toContain('Open');
    expect(JSON.stringify(unchecked?.['unchecked'])).toContain('Shut');
  });

  it('show a control while a swap beside it is on, seeded so it does not flash', () => {
    const rows = shownWhileOn('section_head', true, { type: 'stack_panel' });

    expect(rows.visible).toBe('#visible');
    expect(rows.property_bag).toEqual({ '#visible': true });
    expect(rows.bindings?.[0]?.source_control_name).toBe('section_head');
    // Screen-wide, which the swap's qualified name is what makes safe: a stack
    // puts each child in a row of its own, so the two are never siblings by
    // the time they are drawn.
    expect(rows.bindings?.[0]?.resolve_sibling_scope).toBeUndefined();
    expect(rows.bindings?.[0]?.source_property_name).toBe('#toggle_state');
  });

  it('draw a select as its options, the chosen one selected', () => {
    const option = (name: string, y: number): Parameters<typeof selectFace>[0]['options'][number] => ({
      name,
      rect: { x: 0, y, width: 80, height: 16 },
      background: '', backgroundHover: '', backgroundSelected: '',
      bullet: 'dot', bulletHover: 'dot', bulletSelected: 'dot_on', bulletSelectedHover: 'dot_on',
      bulletWidth: 8, bulletHeight: 8,
      label: name, labelX: 12, labelY: 4, style: STYLE,
    });

    const control = drawn(selectFace({
      name: 'view', rect: RECT, selected: [1], options: [option('first', 0), option('second', 18)],
    }), 'view');

    const rows = childrenOf(control);

    expect(childrenOf(rows[0]?.['first'] ?? {})[0]?.['bullet']?.texture).toBe('dot');
    expect(childrenOf(rows[1]?.['second'] ?? {})[0]?.['bullet']?.texture).toBe('dot_on');
    expect(rows[1]?.['second']?.offset).toEqual([0, 18]);
  });
});
