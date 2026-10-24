import { describe, expect, it } from 'vitest';
import { ControlIndex } from '../control-index';
import type { Control, ControlEntry, Document } from '../jsonui';

describe('socket control positions', () => {
  it('finds descendants and repeated carriers after their parent is wrapped', () => {
    const outer: Control = { type: 'panel', controls: [{ inner: { type: 'label', text: 'before' } }] };
    const document: Document = { namespace: 'test', screen: { type: 'panel', controls: [{ outer }] } };
    const index = new ControlIndex(document);

    index.replace('outer', entry => ({ visible: { type: 'panel', controls: [entry] } }));
    index.replace('inner', entry => ({ inner: { ...entry.inner, text: 'after' } }));
    index.replace('outer', entry => ({ look: { type: 'panel', controls: [entry] } }));

    expect(outer.controls?.[0]?.inner?.text).toBe('after');
    expect(JSON.stringify(document)).toContain('"look"');
    expect(JSON.stringify(document)).toContain('"visible"');
  });

  it('removes discarded descendants and indexes in-place child replacements', () => {
    const document: Document = { namespace: 'test', screen: { type: 'panel', controls: [
      { parent: { type: 'panel', controls: [{ old: { type: 'label' } }] } },
    ] } };
    const index = new ControlIndex(document);

    index.replace('parent', (entry) => {
      entry.parent!.controls = [{ added: { type: 'label' } }];

      return entry;
    });
    expect(() => index.replace('old', entry => entry)).toThrow('no control named "old"');
    index.replace('added', entry => ({ added: { ...entry.added, text: 'found' } }));
    expect(JSON.stringify(document)).toContain('"text":"found"');
  });

  it('prefers definitions and preserves ordered lookup for duplicate child names', () => {
    const first: Control = { type: 'label', text: 'first' };
    const second: Control = { type: 'label', text: 'second' };
    const document: Document = { namespace: 'test', 'target@common.panel': { type: 'panel' },
      screen: { type: 'panel', controls: [{ target: first }, { target: second }] } };
    const index = new ControlIndex(document);

    index.replace('target', () => ({ renamed: { type: 'panel' } }));
    index.replace('target', entry => ({ first: entry.target! }));
    index.replace('target', entry => ({ second: entry.target! }));
    expect(JSON.stringify(document)).toContain('"first":{"type":"label","text":"first"}');
    expect(JSON.stringify(document)).toContain('"second":{"type":"label","text":"second"}');
  });

  it('retains native mutation semantics for shared control arrays', () => {
    const controls: ControlEntry[] = [{ target: { type: 'label', text: 'before' } }];
    const first: Control = { type: 'panel', controls };
    const second: Control = { type: 'panel', controls };
    const document: Document = { namespace: 'test', screen: { type: 'panel', controls: [{ first }, { second }] } };
    const index = new ControlIndex(document);

    index.replace('target', entry => ({ target: { ...entry.target, text: 'after' } }));
    expect(first.controls?.[0]?.target?.text).toBe('after');
    expect(second.controls?.[0]?.target?.text).toBe('after');
    index.replace('first', () => ({ first: { type: 'panel' } }));
    index.replace('target', entry => ({ target: { ...entry.target, text: 'remaining' } }));
    expect(second.controls?.[0]?.target?.text).toBe('remaining');
  });

  it('preserves definition errors in modification documents', () => {
    const document: Document = { namespace: 'test', target: { modifications: [] },
      screen: { type: 'panel', controls: [{ target: { type: 'label' } }] } };
    const index = new ControlIndex(document);

    expect(() => index.replace('target', entry => entry)).toThrow('is not a definition');
  });

  it('keeps unrelated leaf lookups linear as the number of sockets grows', () => {
    const count = 600;
    let visits = 0;
    const controls: ControlEntry[] = Array.from({ length: count }, (_, index) =>
      new Proxy({ ['leaf_' + index]: { type: 'label' as const } }, {
        ownKeys(target) { visits++; return Reflect.ownKeys(target); },
      }));
    const index = new ControlIndex({ namespace: 'test', screen: { type: 'panel', controls } });

    visits = 0;
    for (let at = 0; at < count; at++) { index.replace('leaf_' + at, entry => entry); }
    expect(visits).toBeLessThan(count * 5);
  });
});

it('drops stale children when a renamed definition overwrites another definition', () => {
  const document: Document = { namespace: 'test', first: { type: 'panel' },
    second: { type: 'panel', controls: [{ removed: { type: 'label' } }] } };
  const index = new ControlIndex(document);

  index.replace('first', () => ({ second: { type: 'panel', controls: [{ added: { type: 'label' } }] } }));
  expect(() => index.replace('removed', entry => entry)).toThrow('no control named "removed"');
  index.replace('added', entry => ({ added: { ...entry.added, text: 'found' } }));
  expect(JSON.stringify(document)).toContain('"text":"found"');
});

it('indexes sockets independently of shared passive button-state faces', () => {
  const passive: Control = { type: 'panel', controls: [{ face: { type: 'panel' } }] };
  const count = 600;
  let visits = 0;
  const names = Array.from({ length: count }, (_, index) => 'socket_' + index);
  const controls: ControlEntry[] = [
    { checked: passive }, { checked_hover: passive },
    ...names.map(name => new Proxy({ [name]: { type: 'label' as const } }, {
      ownKeys(target) { visits++; return Reflect.ownKeys(target); },
    })),
  ];
  const index = new ControlIndex({ namespace: 'test', screen: { type: 'panel', controls } }, new Set(names));

  visits = 0;
  for (const name of names) { index.replace(name, entry => entry); }
  expect(visits).toBeLessThan(count * 5);
});

it('falls back when an in-place shared subtree acquires a socket', () => {
  const passive: Control = { type: 'panel', controls: [] };
  const document: Document = { namespace: 'test', screen: { type: 'panel', controls: [{ first: passive }, { second: passive }] } };
  const index = new ControlIndex(document, new Set(['first', 'target']));

  index.replace('first', (entry) => {
    entry.first!.controls!.push({ target: { type: 'label' } });

    return entry;
  });
  index.replace('target', entry => ({ target: { ...entry.target, text: 'shared' } }));
  expect(passive.controls?.[0]?.target?.text).toBe('shared');
});
