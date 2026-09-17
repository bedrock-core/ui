import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
import { describe, expect, it } from 'vitest';
import { Tabs } from '../Tabs/Tabs';
import { theme } from '../tokens';

const t = theme.components.tabs;

/** The styled tab as JSX sees a component: its props are checked by the element, not here. */
const Tab = Tabs.Tab as unknown as FunctionComponent;

describe('styled Tabs', () => {
  // Written in JSX, a tab reaches its group unexpanded: its type is still the styled Tab.
  const drawn = JSON.stringify(Tabs({
    width: 200,
    height: 80,
    children: [
      jsx(Tab, { label: 'One', children: jsx('text', { children: 'first pane' }) }),
      jsx(Tab, { label: 'Two' }),
    ],
  }));

  it('turns each labelled tab into a tab its primitive group draws', () => {
    expect(drawn).toContain('One');
    expect(drawn).toContain('Two');
    expect(drawn).toContain('first pane');
  });

  it('puts the headers on the theme faces at rest, under the pointer and when chosen', () => {
    expect(drawn).toContain(t.textures.normal);
    expect(drawn).toContain(t.textures.hover);
    expect(drawn).toContain(t.textures.pressed);
  });

  it('overlaps neighbouring headers by a texel unless told otherwise', () => {
    expect(drawn).toContain('"gap":-1');
    expect(JSON.stringify(Tabs({ gap: 2, children: [jsx(Tab, { label: 'One' })] }))).toContain('"gap":2');
  });

  it('lets a face given to the group win over the theme', () => {
    const own = JSON.stringify(Tabs({ tabSelected: 'mine/chosen', children: [jsx(Tab, { label: 'One' })] }));

    expect(own).toContain('mine/chosen');
    expect(own).not.toContain(t.textures.pressed);
  });
});
