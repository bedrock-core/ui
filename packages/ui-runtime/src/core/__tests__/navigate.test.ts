import type { Player } from '@minecraft/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  __lastActionForm, __pendingShowCount, __resetFormMocks, __resolveShow, __setDeferredShows,
} from '../../__mocks__/@minecraft/server-ui';
import { registerNativeComponents } from '../../components';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { titleFor } from '../../hosts/form/contract';
import type { FunctionComponent } from '../../jsx';
import { clearHistory, historyOf } from '../history';
import { back, navigate, openScreen, setNavigator, type Navigated } from '../navigate';
import { setReturnAddress, type ReturnAddress } from '../returnAddress';
import { addonReference, presentReference, type ScreenReference } from '../reference';
import { registerCompiledScreen, registerStaticScreens } from '../render/screens';

beforeAll(() => {
  registerNativeComponents();
});

afterEach(() => {
  __resetFormMocks();
  setNavigator(undefined);
  vi.restoreAllMocks();
});

let seed = 0;

const nextPlayer = (): Player => {
  seed += 1;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub: id + the input-lock methods
  return {
    id: `nav-${seed}`,
    inputPermissions: {
      isPermissionCategoryEnabled: (): boolean => true,
      setPermissionCategory: vi.fn(),
    },
  } as unknown as Player;
};

/** Waits for the next form to reach the client, so the test can answer it. */
const untilShown = async (): Promise<void> => {
  for (let tick = 0; tick < 50 && __pendingShowCount() === 0; tick += 1) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

describe('navigating by key', () => {
  it('shows a screen this bundle compiled', () => {
    const player = nextPlayer();
    const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });

    registerCompiledScreen(Home, { key: 'shop:home', title: titleFor('shop_home') });

    expect(navigate('shop:home', player)).toBe(true);
    expect(__lastActionForm()?.titleText).toBe(titleFor('shop_home'));
  });

  it('resolves a key with no addon half against this bundle', () => {
    const player = nextPlayer();
    const Bare: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'bare' }) }) });

    registerCompiledScreen(Bare, { key: 'shop:bare', title: titleFor('shop_bare') });

    expect(navigate('bare', player)).toBe(true);
    expect(__lastActionForm()?.titleText).toBe(titleFor('shop_bare'));
  });

  it('reports a key nothing resolves, and leaves the stack alone', () => {
    const player = nextPlayer();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(navigate('nobody:home', player)).toBe(false);
    expect(historyOf(player.id)).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it('puts the screen being left behind the player, and back() returns to it', () => {
    const player = nextPlayer();
    const First: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'first' }) }) });
    const Second: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'second' }) }) });

    registerCompiledScreen(First, { key: 'stack:first', title: titleFor('stack_first') });
    registerCompiledScreen(Second, { key: 'stack:second', title: titleFor('stack_second') });

    navigate('stack:first', player);
    navigate('stack:second', player);

    expect(historyOf(player.id)).toEqual(['stack:first']);
    expect(back(player)).toBe(true);
    expect(__lastActionForm()?.titleText).toBe(titleFor('stack_first'));
    expect(historyOf(player.id)).toHaveLength(0);
    expect(back(player)).toBe(false);

    clearHistory(player.id);
  });

  it('forgets where a player has been when their session ends', () => {
    const player = nextPlayer();
    const First: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'a' }) }) });
    const Second: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'b' }) }) });

    registerCompiledScreen(First, { key: 'gone:first', title: titleFor('gone_first') });
    registerCompiledScreen(Second, { key: 'gone:second', title: titleFor('gone_second') });

    navigate('gone:first', player);
    navigate('gone:second', player);
    clearHistory(player.id);

    expect(historyOf(player.id)).toHaveLength(0);
    expect(back(player)).toBe(false);
  });

  it('replaces without stacking', () => {
    const player = nextPlayer();
    const Only: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'only' }) }) });

    registerCompiledScreen(Only, { key: 'stack:only', title: titleFor('stack_only') });

    navigate('stack:only', player);
    navigate('stack:only', player, { replace: true });

    expect(historyOf(player.id)).toHaveLength(0);
  });

  it('hands a key it cannot resolve to the installed navigator', () => {
    const player = nextPlayer();
    const seen: string[] = [];

    setNavigator((key) => {
      seen.push(key);

      return true;
    });

    expect(navigate('elsewhere:home', player)).toBe(true);
    expect(seen).toEqual(['elsewhere:home']);
  });
});

describe('crossing into another addon\'s realm', () => {
  it('leaves the stack alone when another realm takes over the screen', () => {
    const player = nextPlayer();
    const Here: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'here' }) }) });

    registerCompiledScreen(Here, { key: 'cross:here', title: titleFor('cross_here') });

    setNavigator({
      show: (key): Navigated => (key === 'cross:here' ? openScreen(key, player) : 'handed-off'),
    });

    navigate('cross:here', player);
    // The screen being left travelled with the request as the return address, so this realm
    // must not also stack it — the player would pass it twice on the way back.
    expect(navigate('other:leaf', player)).toBe(true);
    expect(historyOf(player.id)).toHaveLength(0);

    clearHistory(player.id);
  });

  it('sends the player back to the realm they came from once the local stack is empty', () => {
    const player = nextPlayer();
    const First: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'first' }) }) });
    const Second: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'second' }) }) });
    const sent: ReturnAddress[] = [];

    registerCompiledScreen(First, { key: 'guest:first', title: titleFor('guest_first') });
    registerCompiledScreen(Second, { key: 'guest:second', title: titleFor('guest_second') });

    setNavigator({
      show: (key, who, options): Navigated => openScreen(key, who, options),
      sendBack: (address): boolean => {
        sent.push(address);

        return true;
      },
    });

    setReturnAddress(player.id, { realm: 'economy', target: { kind: 'screen', key: 'economy:list' } });

    navigate('guest:first', player);
    navigate('guest:second', player);

    // This realm's own stack first.
    expect(back(player)).toBe(true);
    expect(sent).toHaveLength(0);

    // Its bottom is the hop, not the end.
    expect(back(player)).toBe(true);
    expect(sent).toEqual([{ realm: 'economy', target: { kind: 'screen', key: 'economy:list' } }]);

    // And exactly once: the realm returned to sets its own address as it shows the player.
    expect(back(player)).toBe(false);
    expect(sent).toHaveLength(1);

    clearHistory(player.id);
  });

  it('ends at the bottom of the stack when nothing asked this realm to show anything', () => {
    const player = nextPlayer();
    const Only: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'only' }) }) });

    registerCompiledScreen(Only, { key: 'alone:only', title: titleFor('alone_only') });

    setNavigator({
      show: (key, who, options): Navigated => openScreen(key, who, options),
      sendBack: (): boolean => true,
    });

    navigate('alone:only', player);

    expect(back(player)).toBe(false);
  });
});

describe('a screen as another addon can show it', () => {
  it('publishes the table the build baked, and nothing it would have to walk', () => {
    // A static screen has no component here at all: the build described it in
    // full, so what an addon publishes is what it was handed.
    registerStaticScreens([
      { key: 'docs:index', title: titleFor('docs_index'), values: [''], targets: [{ to: 'docs:page' }] },
    ]);

    const reference = addonReference('docs');
    const index = reference.screens['docs:index'];

    expect(index?.title).toBe(titleFor('docs_index'));
    expect(index?.targets).toEqual([{ to: 'docs:page' }]);
  });

  it('shows one of its own static screens without a component', async () => {
    const player = nextPlayer();

    registerStaticScreens([
      { key: 'docs:standalone', title: titleFor('docs_standalone'), values: [''], targets: [null] },
    ]);

    expect(navigate('docs:standalone', player)).toBe(true);

    // The walk is asynchronous: the form reaches the client on the next turn.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(__lastActionForm()?.titleText).toBe(titleFor('docs_standalone'));
  });

  it('follows the links of a foreign screen until one leads nowhere', async () => {
    const player = nextPlayer();
    const table: Record<string, ScreenReference> = {
      'docs:one': { key: 'docs:one', title: titleFor('docs_one'), values: [''], targets: [{ to: 'docs:two' }] },
      'docs:two': { key: 'docs:two', title: titleFor('docs_two'), values: [''], targets: [null] },
    };
    const shown: string[] = [];

    __setDeferredShows(true);

    const walk = presentReference((key) => {
      const found = table[key];

      if (found !== undefined) { shown.push(key); }

      return found;
    }, 'docs:one', player);

    await untilShown();
    // The first screen's only press leads to the second.
    __resolveShow({ canceled: false, selection: 0 });

    await untilShown();
    __resolveShow({ canceled: true });

    await walk;

    expect(shown).toEqual(['docs:one', 'docs:two']);
  });

  it('says whether a walk ended on a back press or on the player leaving', async () => {
    const player = nextPlayer();
    const table: Record<string, ScreenReference> = {
      'docs:index': { key: 'docs:index', title: titleFor('docs_index'), values: [''], targets: [{ back: true }] },
    };

    __setDeferredShows(true);

    const walk = presentReference(key => table[key], 'docs:index', player);

    await untilShown();
    // The first screen's only press is the back control, and nothing is behind it.
    __resolveShow({ canceled: false, selection: 0 });

    await expect(walk).resolves.toBe('back');

    const dismissed = presentReference(key => table[key], 'docs:index', player);

    await untilShown();
    __resolveShow({ canceled: true });

    await expect(dismissed).resolves.toBe('done');
  });

  it('takes a back press inside a walk to the screen before it', async () => {
    const player = nextPlayer();
    const table: Record<string, ScreenReference> = {
      'docs:index': { key: 'docs:index', title: titleFor('docs_index'), values: [''], targets: [{ to: 'docs:page' }] },
      'docs:page': { key: 'docs:page', title: titleFor('docs_page'), values: [''], targets: [{ back: true }] },
    };
    const shown: string[] = [];

    __setDeferredShows(true);

    const walk = presentReference((key) => {
      const found = table[key];

      if (found !== undefined) { shown.push(key); }

      return found;
    }, 'docs:index', player);

    await untilShown();
    __resolveShow({ canceled: false, selection: 0 });

    await untilShown();
    // Back from the page: the walk returns to the index rather than ending.
    __resolveShow({ canceled: false, selection: 0 });

    await untilShown();
    __resolveShow({ canceled: true });

    await expect(walk).resolves.toBe('done');
    expect(shown).toEqual(['docs:index', 'docs:page', 'docs:index']);
  });
});
