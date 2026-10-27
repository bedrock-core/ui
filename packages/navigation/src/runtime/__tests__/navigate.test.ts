import { stateFor } from '../../__tests__/state';
import { system, type Player } from '@minecraft/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  uiManager, __lastActionForm, __pendingShowCount, __resetFormMocks, __resolveShow, __setDeferredShows,
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
import { observeRenderLifecycle, registerCompiledScreen, render, renderSession, registerStaticScreens as registerStaticLayouts } from '@bedrock-core/ui-runtime';

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
  await vi.waitFor(() => { expect(__pendingShowCount()).toBeGreaterThan(0); }, { timeout: 1000, interval: 5 });
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

  it('closes an outstanding native form before a static walk and preserves Back destinations', async () => {
    const player = nextPlayer();
    const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });
    const Live: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'live' }) }) });

    registerCompiledScreen(Home, { key: 'pending:home', title: titleFor('pending_home') });
    registerCompiledScreen(Live, { key: 'pending:live', title: titleFor('pending_live') });
    registerStaticScreens([
      { key: 'pending:index', title: titleFor('pending_index'), values: ['', ''], targets: [{ to: 'pending:live' }, { back: true }] },
    ]);
    __setDeferredShows(true);

    try {
      navigate('pending:home', player);
      expect(__pendingShowCount()).toBe(1);
      navigate('pending:index', player);
      await untilShown();
      expect(__pendingShowCount()).toBe(1);
      expect(__lastActionForm()?.titleText).toBe(titleFor('pending_index'));
      expect(historyOf(player)).toEqual(['pending:home']);

      __resolveShow({ canceled: false, selection: 0 });
      await untilShown();
      expect(__pendingShowCount()).toBe(1);
      expect(__lastActionForm()?.titleText).toBe(titleFor('pending_live'));
      expect(historyOf(player)).toEqual(['pending:home', 'pending:index']);

      expect(back(player)).toBe(true);
      await untilShown();
      expect(__pendingShowCount()).toBe(1);
      expect(__lastActionForm()?.titleText).toBe(titleFor('pending_index'));
      expect(historyOf(player)).toEqual(['pending:home']);

      __resolveShow({ canceled: false, selection: 1 });
      await untilShown();
      expect(__pendingShowCount()).toBe(1);
      expect(__lastActionForm()?.titleText).toBe(titleFor('pending_home'));
      expect(historyOf(player)).toEqual([]);
    } finally { closeUi(player); }
  });

  it('closes a native show that becomes closable after the initial release', async () => {
    const player = nextPlayer();
    const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });

    registerCompiledScreen(Home, { key: 'queued:home', title: titleFor('queued_home') });
    registerStaticScreens([{ key: 'queued:index', title: titleFor('queued_index'), values: [''], targets: [null] }]);
    __setDeferredShows(true);
    navigate('queued:home', player);
    const close = vi.spyOn(uiManager, 'closeAllForms').mockImplementationOnce(() => undefined);

    try {
      navigate('queued:index', player);
      expect(__lastActionForm()?.titleText).toBe(titleFor('queued_home'));
      await vi.waitFor(() => { expect(__lastActionForm()?.titleText).toBe(titleFor('queued_index')); });
      expect(close.mock.calls.filter(([who]) => who === player)).toHaveLength(2);
      expect(__pendingShowCount()).toBe(1);
      expect(historyOf(player)).toEqual(['queued:home']);
    } finally { closeUi(player); }
  });

  it.each((['navigate', 'render', 'close', 'handoff', 'reference'] as const).flatMap(operation =>
    [0, 1].map(stage => ({ operation, stage }))))(
    'does not close or reopen a delayed reference after a newer $operation at barrier $stage', async ({ operation, stage }) => {
      const player = nextPlayer();
      const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });
      const Live: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'live' }) }) });
      const callbacks: (() => void)[] = [];

      registerCompiledScreen(Home, { key: 'supersede:home', title: titleFor('supersede_home') });
      registerCompiledScreen(Live, { key: 'supersede:live', title: titleFor('supersede_live') });
      registerStaticScreens([
        { key: 'supersede:index', title: titleFor('supersede_index'), values: [''], targets: [null] },
        { key: 'supersede:new', title: titleFor('supersede_new'), values: [''], targets: [null] },
      ]);
      vi.spyOn(system, 'runTimeout').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
      __setDeferredShows(true);
      setNavigator((key, target, options) => {
        if (key !== 'supersede:index') { return openScreen(key, target, options); }

        void presentReference(candidate => screenReferences()[candidate], key, target).then((ended) => {
          if (ended === 'done') { closeUi(target); }
        });

        return true;
      });

      try {
        navigate('supersede:home', player);
        navigate('supersede:index', player);
        expect(callbacks).toHaveLength(1);

        if (stage === 1) {
          callbacks.shift()?.();
          await Promise.resolve();
          await Promise.resolve();
          expect(callbacks).toHaveLength(1);
        }

        if (operation === 'navigate') { navigate('supersede:live', player); }
        if (operation === 'render') { renderDestination(Live, player, { key: 'supersede:live' }); }
        if (operation === 'close') { closeUi(player); }
        if (operation === 'handoff') { handOff(player); }
        if (operation === 'reference') { void presentReference(key => screenReferences()[key], 'supersede:new', player); }

        const closeCount = uiManager.closeAllForms.mock.calls.length;
        callbacks.shift()?.();
        await Promise.resolve();
        await Promise.resolve();
        expect(uiManager.closeAllForms.mock.calls).toHaveLength(closeCount);
        expect(__lastActionForm()?.titleText).not.toBe(titleFor('supersede_index'));

        if (operation === 'navigate' || operation === 'render') {
          expect(__lastActionForm()?.titleText).toBe(titleFor('supersede_live'));
          expect(__pendingShowCount()).toBe(1);
        }
      } finally { closeUi(player); }
    },
  );

  it('keeps a host logical destination while presenting its canonical static reference', async () => {
    const player = nextPlayer();
    const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });

    registerCompiledScreen(Home, { key: 'alias:home', title: titleFor('alias_home') });
    registerStaticScreens([{ key: 'alias:canonical', title: titleFor('alias_canonical'), values: [''], targets: [null] }]);
    setNavigator((key, target, options) => {
      if (key !== 'foreign:alias') { return openScreen(key, target, options); }

      void presentReference(candidate => screenReferences()[candidate], 'alias:canonical', target).then((ended) => {
        if (ended === 'done') { closeUi(target); }
      });

      return true;
    });
    __setDeferredShows(true);

    try {
      navigate('alias:home', player);
      expect(navigate('foreign:alias', player)).toBe(true);
      await vi.waitFor(() => { expect(__lastActionForm()?.titleText).toBe(titleFor('alias_canonical')); });
      expect(currentLocation(player)?.key).toBe('foreign:alias');
      expect(historyOf(player)).toEqual(['alias:home']);
      expect(__pendingShowCount()).toBe(1);
    } finally { closeUi(player); }
  });

  it.each(['queued', 'visible'] as const)('keeps a %s static walk usable after rejected navigation', async (stage) => {
    const player = nextPlayer();
    const Home: FunctionComponent = () => Screen({ children: Panel({ children: Text({ children: 'home' }) }) });

    registerCompiledScreen(Home, { key: 'reject:home', title: titleFor('reject_home') });
    registerStaticScreens([{ key: 'reject:index', title: titleFor('reject_index'), values: [''], targets: [{ back: true }] }]);
    setNavigator((key, target, options) => {
      if (key !== 'reject:index') { return openScreen(key, target, options); }

      void presentReference(candidate => screenReferences()[candidate], key, target).then((ended) => {
        if (ended === 'done') { closeUi(target); }
        if (ended === 'back') { back(target); }
      });

      return true;
    });
    __setDeferredShows(true);

    try {
      navigate('reject:home', player);
      navigate('reject:index', player);

      if (stage === 'visible') {
        await vi.waitFor(() => { expect(__lastActionForm()?.titleText).toBe(titleFor('reject_index')); });
      }

      expect(navigate('reject:missing', player)).toBe(false);
      await vi.waitFor(() => { expect(__lastActionForm()?.titleText).toBe(titleFor('reject_index')); });
      expect(historyOf(player)).toEqual(['reject:home']);
      __resolveShow({ canceled: false, selection: 0 });
      await untilShown();
      expect(__lastActionForm()?.titleText).toBe(titleFor('reject_home'));
    } finally { closeUi(player); }
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

    await untilShown();

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


describe('plain root props on Back', () => {
  it('returns from Settings to the populated page opened by a direct render', async () => {
    const player = nextPlayer();
    const records = Array.from({ length: 10 }, (_, index) => ({ owner: player.id, label: `grave-${String(index)}` }));
    const seen: Array<{ playerId: string; page: number; row: string }> = [];
    const List: FunctionComponent = (props) => {
      const playerId = typeof props.playerId === 'string' ? props.playerId : '';
      const page = typeof props.page === 'number' ? props.page : 0;
      const row = records.filter(record => record.owner === playerId)[page * 8]?.label ?? 'empty';

      seen.push({ playerId, page, row });

      return Screen({ children: Panel({ children: [
        Button({ onPress: () => navigate('plain-params:settings', player), children: Text({ children: 'Settings' }) }),
        Text({ maxLength: 24, children: row }),
      ] }) });
    };
    const Settings: FunctionComponent = () => Screen({ children: Panel({
      children: Button({ onPress: () => back(player), children: Text({ children: 'Back' }) }),
    }) });

    registerCompiledScreen(List, { key: 'plain-params:list', title: titleFor('plain_params_list') });
    registerCompiledScreen(Settings, { key: 'plain-params:settings', title: titleFor('plain_params_settings') });
    __setDeferredShows(true);
    render({ type: List, props: { playerId: player.id, page: 1 } }, player);
    await untilShown();

    expect(__lastActionForm()?.buttons).toContain('grave-8');
    __resolveShow({ canceled: false, selection: 0 });
    await vi.waitFor(() => { expect(__lastActionForm()?.titleText).toBe(titleFor('plain_params_settings')); });

    expect(navigationSnapshot(player).history).toEqual([{ key: 'plain-params:list', params: { playerId: player.id, page: 1 } }]);
    __resolveShow({ canceled: false, selection: 0 });
    await vi.waitFor(() => { expect(__lastActionForm()?.titleText).toBe(titleFor('plain_params_list')); });

    expect(seen.at(-1)).toEqual({ playerId: player.id, page: 1, row: 'grave-8' });
    expect(__lastActionForm()?.buttons).toContain('grave-8');
    expect(currentLocation(player)).toEqual({ key: 'plain-params:list', params: { playerId: player.id, page: 1 } });
    closeUi(player);
  });
});
