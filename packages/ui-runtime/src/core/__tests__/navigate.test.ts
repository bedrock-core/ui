import type { Player } from '@minecraft/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  __lastActionForm, __pendingShowCount, __resetFormMocks, __resolveShow, __setDeferredShows,
} from '../../__mocks__/@minecraft/server-ui';
import { registerNativeComponents } from '../../components';
import { Link } from '../../components/Link';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { titleFor } from '../../hosts/form/contract';
import type { FunctionComponent, JSX } from '../../jsx';
import { clearHistory, historyOf } from '../history';
import { back, navigate, setNavigator } from '../navigate';
import { addonReference, presentReference, type ScreenReference } from '../reference';
import { registerCompiledScreen } from '../render/screens';

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

/** A screen whose one button is a link to `to`. */
const linking = (to: string): FunctionComponent => (): JSX.Element => Screen({
  children: Panel({ children: Link({ to, children: Text({ children: 'go' }) }) }),
});

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

describe('a screen as another addon can show it', () => {
  it('carries where each press leads, with the addon half filled in', () => {
    const Index = linking('page');

    registerCompiledScreen(Index, { key: 'docs:index', title: titleFor('docs_index') });

    const reference = addonReference('docs');
    const index = reference.screens['docs:index'];

    expect(index?.title).toBe(titleFor('docs_index'));
    expect(index?.targets).toEqual([{ to: 'docs:page' }]);
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
