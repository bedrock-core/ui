import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import { __lastActionForm, __resetFormMocks, __resolveShow, __setDeferredShows } from '../../__mocks__/@minecraft/server-ui';
import { render } from '../../core/render/lifecycle';
import { registerCompiledScreen } from '../../core/render/screens';
import { titleFor } from '../../hosts/form/contract';
import type { FunctionComponent, JSX } from '../../jsx';
import { Button } from '../Button';
import { Panel } from '../Panel';
import { Screen } from '../Screen';
import { Trans } from '../Trans';

function el(type: unknown, props: Record<string, unknown>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test element factory; the { type, props } shape is a JSX.Element at runtime
  return { type, props } as JSX.Element;
}

/** Flush the full microtask queue (and one macrotask turn). */
function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

afterEach(() => {
  __resetFormMocks();
});

describe('Trans on a screen rendered at runtime', () => {
  it('draws the pieces its build recorded, each press running its own handler', async () => {
    __setDeferredShows(true);

    const shop = vi.fn();
    const rules = vi.fn();
    const App: FunctionComponent = () => el(Screen, {
      children: el(Panel, {
        width: 300,
        children: el(Trans, {
          i18nKey: 'a.help',
          width: '100%',
          components: { shop: el(Button, { onPress: shop }), rules: el(Button, { onPress: rules }) },
        }),
      }),
    });

    // What the build laid out: the rules link wrapped onto the second line.
    registerCompiledScreen(App, {
      key: 'trans:runtime',
      title: titleFor('trans_runtime'),
      snapshot: {
        shape: '',
        baked: [],
        vis: [],
        trans: [{ s: 0, l: [[{ c: [], v: 'See ' }, { c: ['shop'], v: 'the shop' }, { c: [], v: ' or' }], [{ c: ['rules'], v: 'the rules' }]] }],
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub: an id is all a session is keyed by
    render(App, { id: 'reader' } as unknown as Player);
    await tick();

    expect(__lastActionForm()?.buttons).toHaveLength(2);

    __resolveShow({ canceled: false, selection: 1 });
    await tick();

    expect(rules).toHaveBeenCalledOnce();
    expect(shop).not.toHaveBeenCalled();
  });
});
