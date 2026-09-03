import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import {
  __lastActionForm,
  __resetFormMocks,
  __resolveShow,
  __setDeferredShows,
} from '../../../__mocks__/@minecraft/server-ui';
import { Button } from '../../../components/Button';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import type { FunctionComponent, JSX } from '../../../jsx';
import { playerOwner } from '../../fabric';
import { render } from '../lifecycle';
import { registerCompiledScreen } from '../screens';
import { cleanupComponentTree } from '../tree';

// A handoff between COMPILED screens: the chain must show the swapped-in root
// under its own title, which is how the client picks its layout. Showing it
// under the first root's title drew the first layout again with the second
// screen's entries behind it — every guide page looked like the index.

const el = (type: unknown, props: Record<string, unknown>): JSX.Element =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test element factory
  ({ type, props }) as JSX.Element;

const screenOf = (label: string, onPress: () => unknown): JSX.Element =>
  el(Panel, { width: 220, height: 120, children: [el(Button, { onPress, children: el(Text, { children: label }) })] });

const tick = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0); });

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub
const player = {
  id: 'handoff',
  inputPermissions: { isPermissionCategoryEnabled: (): boolean => true, setPermissionCategory: vi.fn() },
} as unknown as Player;

afterEach(() => {
  __resetFormMocks();
  cleanupComponentTree(playerOwner(player));
});

describe('a handoff between compiled screens', () => {
  it('shows the swapped-in root under its own compiled title', async () => {
    __setDeferredShows(true);

    const Page: FunctionComponent = () => screenOf('page', () => undefined);
    const Home: FunctionComponent = () => screenOf('home', async () => {
      await Promise.resolve();
      render(Page, player);
    });

    registerCompiledScreen(Home, 'core1:test_home');
    registerCompiledScreen(Page, 'core1:test_page');

    render(Home, player);
    await tick();

    expect(__lastActionForm()?.titleText).toBe('core1:test_home');

    __resolveShow({ canceled: false, selection: 0 });
    await tick();

    expect(__lastActionForm()?.titleText).toBe('core1:test_page');
  });
});
