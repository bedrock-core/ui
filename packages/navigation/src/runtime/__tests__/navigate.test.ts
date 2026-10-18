import { stateFor } from '../../__tests__/state';
import type { Player } from '@minecraft/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  __lastActionForm, __pendingShowCount, __resetFormMocks, __resolveShow, __setDeferredShows,
} from '../../../../ui-runtime/src/__mocks__/@minecraft/server-ui';
import { registerNativeComponents } from '../../../../ui-runtime/src/components';
import { Button } from '../../../../ui-runtime/src/components/Button';
import { Panel } from '../../../../ui-runtime/src/components/Panel';
import { Screen } from '../../../../ui-runtime/src/components/Screen';
import { Text } from '../../../../ui-runtime/src/components/Text';
import { titleFor } from '../../../../ui-runtime/src/hosts/form/contract';
import type { FunctionComponent } from '../../../../ui-runtime/src/jsx';
import { clearHistory, currentLocation, historyOf, navigationSnapshot, type NavigationSnapshot, type ScreenLocation } from '../history';
import { back, closeUi, handOff, navigate, navigateAsync, openScreen, renderDestination, setNavigator, type Navigated, type NavigateOptions } from '../navigate';
import { screenReferences, presentReference, type ScreenReference } from '../reference';
import { observeRenderLifecycle, registerCompiledScreen, renderSession, registerStaticScreens as registerStaticLayouts } from '@bedrock-core/ui-runtime';

const registerStaticScreens = (records: readonly ScreenReference[]): void => {
  registerStaticLayouts(records.map(record => ({ key: record.key, title: record.title, values: record.values, actions: record.targets })));
};

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

describe('navigation host transfers', () => {
  it('retains a newer navigation accepted by a release observer', () => {
    const player = nextPlayer();
    const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });

    registerCompiledScreen(Home, { key: 'release:home', title: titleFor('release_home') });
    __setDeferredShows(true);
    navigate('release:home', player);
    setNavigator(() => true);
    const stop = observeRenderLifecycle((event) => {
      if (event.type === 'ended' && event.reason === 'released' && event.session.ownerId === player.id) {
        navigate('release:next', player, { params: { section: 'tools' } });
      }
    });

    handOff(player);
    stop();

    expect(renderSession(player.id)).toBeUndefined();
    expect(navigationSnapshot(player)).toEqual({ current: { key: 'release:next', params: { section: 'tools' } }, history: [] });
    closeUi(player);
  });

  it('keeps an asynchronous private host on its public destination during render and Back', async () => {
    const player = nextPlayer();
    const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });
    const seen: NavigationSnapshot[] = [];
    const locations: Array<ScreenLocation | undefined> = [];
    const Private: FunctionComponent = () => {
      seen.push(navigationSnapshot(player));
      locations.push(currentLocation(player));

      return Screen({ children: Panel({ children: Text({ children: 'private host' }) }) });
    };

    registerCompiledScreen(Home, { key: 'async:home', title: titleFor('async_home') });
    registerCompiledScreen(Private, { key: 'async:private', title: titleFor('async_private') });
    __setDeferredShows(true);
    setNavigator(async (key, who, options) => {
      if (key === 'async:home') { return openScreen(key, who, options); }

      await Promise.resolve();
      renderDestination(Private, who, {
        key, params: options.params, ...options.checkpoint,
      });

      return true;
    });

    await navigateAsync('async:home', player);
    await expect(navigateAsync('async:public', player, {
      params: { section: 'tools' },
      checkpoint: {
        navigatorStates: { tools: stateFor('tools', 'home', 'detail') },
      },
    })).resolves.toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.history).toEqual([{ key: 'async:home' }]);
    expect(locations).toEqual([{
      key: 'async:public', params: { section: 'tools' }, navigatorStates: { tools: stateFor('tools', 'home', 'detail') },
    }]);
    expect(renderSession(player.id)?.screenKey).toBe('async:private');
    expect(back(player)).toBe(true);
    await Promise.resolve();
    expect(navigationSnapshot(player)).toEqual({ current: { key: 'async:home' }, history: [] });
    closeUi(player);
  });

  it('transfers the full history and leaves the destination to its host', () => {
    const player = nextPlayer();
    const Here: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'here' }) }) });
    const handed: NavigationSnapshot[] = [];

    registerCompiledScreen(Here, { key: 'cross:here', title: titleFor('cross_here') });
    setNavigator({
      show: (key, who, options): Navigated => {
        if (key === 'cross:here') { return openScreen(key, who, options); }

        handed.push(navigationSnapshot(who));
        clearHistory(who.id);

        return 'handed-off';
      },
    });

    navigate('cross:here', player, { params: { section: 'tools' }, checkpoint: { navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } } });
    expect(navigate('other:leaf', player)).toBe(true);
    expect(handed).toEqual([{
      current: { key: 'cross:here', params: { section: 'tools' }, navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } },
      history: [{ key: 'cross:here', params: { section: 'tools' }, navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } }],
    }]);
    expect(navigationSnapshot(player)).toEqual({ history: [] });
  });

  it('stops Back at the root without invoking the navigation host', () => {
    const player = nextPlayer();
    const show = vi.fn(() => true);

    setNavigator({ show });
    navigate('root:only', player, { params: { id: 7 } });
    const before = navigationSnapshot(player);

    expect(back(player)).toBe(false);
    expect(show).toHaveBeenCalledTimes(1);
    expect(navigationSnapshot(player)).toEqual(before);
    clearHistory(player.id);
  });
});

describe('a screen as another addon can show it', () => {
  it('publishes the table the build baked, and nothing it would have to walk', () => {
    // A static screen has no component here at all: the build described it in
    // full, so what an addon publishes is what it was handed.
    registerStaticScreens([
      { key: 'docs:index', title: titleFor('docs_index'), values: [''], targets: [{ to: 'docs:page' }] },
    ]);

    const reference = screenReferences();
    const index = reference['docs:index'];

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

  it('navigates from a static screen to a screen with handlers of its own, and back', async () => {
    const player = nextPlayer();
    const Live: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'live' }) }) });

    registerStaticScreens([
      { key: 'mix:index', title: titleFor('mix_index'), values: [''], targets: [{ to: 'mix:live' }] },
    ]);
    registerCompiledScreen(Live, { key: 'mix:live', title: titleFor('mix_live') });

    __setDeferredShows(true);

    expect(navigate('mix:index', player)).toBe(true);

    await untilShown();
    // The index's only press links to a screen no table describes.
    __resolveShow({ canceled: false, selection: 0 });

    await untilShown();

    expect(__lastActionForm()?.titleText).toBe(titleFor('mix_live'));
    expect(historyOf(player.id)).toEqual(['mix:index']);

    expect(back(player)).toBe(true);

    await untilShown();

    expect(__lastActionForm()?.titleText).toBe(titleFor('mix_index'));

    clearHistory(player.id);
  });

  it('opens a screen with handlers of its own with the params its static link carries', async () => {
    const player = nextPlayer();
    const received: unknown[] = [];
    const Target: FunctionComponent = ({ message }) => {
      received.push(message);

      return Screen({ children: Panel({ children: Text({ maxLength: 32, children: typeof message === 'string' ? message : '(none)' }) }) });
    };

    registerStaticScreens([
      {
        key: 'mixp:index',
        title: titleFor('mixp_index'),
        values: [''],
        targets: [{ to: 'mixp:target', params: { message: 'sent through params' } }],
      },
    ]);
    registerCompiledScreen(Target, { key: 'mixp:target', title: titleFor('mixp_target') });

    __setDeferredShows(true);

    expect(navigate('mixp:index', player)).toBe(true);

    await untilShown();
    __resolveShow({ canceled: false, selection: 0 });

    await untilShown();

    expect(__lastActionForm()?.titleText).toBe(titleFor('mixp_target'));
    expect(received).toContain('sent through params');
    expect(received).not.toContain(undefined);
    expect(historyOf(player.id)).toEqual(['mixp:index']);

    clearHistory(player.id);
  });

  it('hands a static link\'s params and replace on to the navigator together', async () => {
    const player = nextPlayer();
    const handed: { key: string; options: NavigateOptions }[] = [];

    setNavigator({
      show: (key, who, options): Navigated => {
        if (openScreen(key, who, options)) { return true; }

        handed.push({ key, options });

        return 'handed-off';
      },
    });
    registerStaticScreens([
      {
        key: 'mixr:index',
        title: titleFor('mixr_index'),
        values: [''],
        targets: [{ to: 'elsewhere:page', params: { id: 'diamond' }, replace: true }],
      },
    ]);

    __setDeferredShows(true);

    navigate('mixr:index', player);

    await untilShown();
    __resolveShow({ canceled: false, selection: 0 });

    for (let tick = 0; tick < 10 && handed.length === 0; tick += 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    expect(handed).toEqual([{ key: 'elsewhere:page', options: { params: { id: 'diamond' }, replace: true } }]);

    clearHistory(player.id);
  });

  it('takes a back press on the first screen of its own static walk back through the stack', async () => {
    const player = nextPlayer();
    const Start: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'start' }) }) });

    registerCompiledScreen(Start, { key: 'mixb:start', title: titleFor('mixb_start') });
    registerStaticScreens([
      { key: 'mixb:page', title: titleFor('mixb_page'), values: [''], targets: [{ back: true }] },
    ]);

    navigate('mixb:start', player);

    __setDeferredShows(true);

    navigate('mixb:page', player);

    expect(historyOf(player.id)).toEqual(['mixb:start']);

    await untilShown();
    // Nothing is behind the page inside the walk, so the back press is the stack's.
    __resolveShow({ canceled: false, selection: 0 });

    await untilShown();

    expect(__lastActionForm()?.titleText).toBe(titleFor('mixb_start'));
    expect(historyOf(player.id)).toHaveLength(0);

    clearHistory(player.id);
  });

  it('ends the screen a press left before a static screen shows, so it does not present again over it', async () => {
    const player = nextPlayer();
    const Menu: FunctionComponent = () => Screen({
      children: Panel({
        children: Button({ onPress: ({ player: who }) => { navigate('race:static', who); }, children: Text({ children: 'go' }) }),
      }),
    });

    registerCompiledScreen(Menu, { key: 'race:menu', title: titleFor('race_menu') });
    registerStaticScreens([
      { key: 'race:static', title: titleFor('race_static'), values: [''], targets: [{ back: true }] },
    ]);

    __setDeferredShows(true);
    navigate('race:menu', player);

    await untilShown();
    // The menu's press navigates to the static screen.
    __resolveShow({ canceled: false, selection: 0 });

    for (let tick = 0; tick < 10; tick += 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Only the static screen is up: the menu's session did not present itself again.
    expect(__pendingShowCount()).toBe(1);
    expect(__lastActionForm()?.titleText).toBe(titleFor('race_static'));

    // Its back press returns to the menu through the stack the session left intact.
    __resolveShow({ canceled: false, selection: 0 });

    await untilShown();

    expect(__lastActionForm()?.titleText).toBe(titleFor('race_menu'));

    clearHistory(player.id);
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
