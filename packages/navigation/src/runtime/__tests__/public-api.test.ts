import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as runtime from '@bedrock-core/ui-runtime';
import * as navigation from '@bedrock-core/ui/navigation';
import * as alias from '@bedrock-core/navigation';
import * as extension from '@bedrock-core/navigation/runtime';
import { __lastActionForm, __resetFormMocks, __resolveShow, __setDeferredShows } from '../../../../ui-runtime/src/__mocks__/@minecraft/server-ui';
import { historyOf, navigationSnapshot, noteLocation } from '../history';

vi.mock('@bedrock-core/server-runtime', () => { throw new Error('Runtime navigation must not load Core.'); });
vi.mock('@bedrock-core/sync', () => { throw new Error('Runtime navigation must not load shared state transport.'); });

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub for render and input locks
const player = {
  id: 'navigation-public-api',
  inputPermissions: { isPermissionCategoryEnabled: () => true, setPermissionCategory: vi.fn() },
} as unknown as Player;

afterEach(() => {
  extension.setNavigator(undefined);
  alias.closeUi(player);
  __resetFormMocks();
  vi.restoreAllMocks();
});

describe('standalone navigation entry points', () => {
  it('discovers standalone renders and ignores superseded observer notifications', () => {
    const Page = (): runtime.JSX.Element => runtime.Screen({ children: runtime.Panel({ children: runtime.Text({ children: 'direct render' }) }) });
    const Next = (): runtime.JSX.Element => runtime.Screen({ children: runtime.Panel({ children: runtime.Text({ children: 'observer render' }) }) });
    let redirect = false;
    let reopen = false;

    runtime.registerCompiledScreen(Page, { key: 'late:page', title: 'late-page' });
    runtime.registerCompiledScreen(Next, { key: 'late:next', title: 'late-next' });
    const stop = runtime.observeRenderLifecycle((event) => {
      if (redirect && event.type !== 'ended' && event.session.screenKey === 'late:page') { runtime.render(Next, player); }

      if (reopen && event.type === 'ended' && event.session.screenKey === 'late:next') {
        reopen = false;
        runtime.render(Next, player);
      }
    });

    __setDeferredShows(true);
    runtime.render(Page, player);

    expect(extension.currentLocation(player)?.key).toBe('late:page');
    expect(alias.back(player)).toBe(false);
    redirect = true;
    runtime.render(Page, player);
    expect(runtime.renderSession(player.id)?.screenKey).toBe('late:next');
    expect(extension.currentLocation(player)?.key).toBe('late:next');
    reopen = true;
    runtime.endRender(player);
    expect(runtime.renderSession(player.id)?.screenKey).toBe('late:next');
    expect(extension.currentLocation(player)?.key).toBe('late:next');
    stop();
  });

  it('exposes the same API and function identities through both navigation names', () => {
    expect(Object.keys(alias).filter(name => name !== 'navigation' && name !== 'ScreensRegistry').sort()).toEqual(Object.keys(navigation).sort());

    for (const name of Object.keys(navigation)) {
      const actual: unknown = Reflect.get(alias, name);
      const expected: unknown = Reflect.get(navigation, name);

      expect(actual).toBe(expected);
    }

    for (const name of ['navigate', 'back', 'historyOf', 'useNavigation', 'Link', 'navigation']) {
      expect(Object.hasOwn(runtime, name)).toBe(false);
    }

    for (const removed of ['createNavigationGroup', 'planNavigationGroup', 'navigationGraph', 'navigationContextKey',
      'setNavigator', 'openScreen', 'renderDestination', 'checkpoint', 'currentLocation', 'clearHistory', 'historyOf',
      'navigationSnapshot', 'noteLocation', 'noteShown', 'popHistory', 'pushHistory', 'restoreNavigation',
      'registerScreenDescriptor', 'screenDescriptor', 'registerStaticScreens', 'provideReferences', 'linkTarget',
      'replace', 'reset', 'currentKey', 'canGoBack']) {
      expect(Object.hasOwn(alias, removed)).toBe(false);
    }

    expect(Object.hasOwn(alias, 'navigation')).toBe(false);
    expect(Object.hasOwn(alias, 'ScreensRegistry')).toBe(false);
    expect(Object.keys(extension).sort()).toEqual([
      'checkpoint', 'createNavigatorFactory', 'currentLocation', 'openScreen', 'renderDestination', 'setNavigator',
    ]);
  });

  it('shares host history and replacement across the public entry points', () => {
    extension.setNavigator(() => true);

    expect(navigation.navigate('alias:home', player)).toBe(true);
    expect(alias.navigate('alias:detail', player)).toBe(true);
    expect(historyOf(player)).toEqual(['alias:home']);
    expect(navigation.navigate('alias:edit', player, { replace: true })).toBe(true);
    expect(extension.currentLocation(player)?.key).toBe('alias:edit');
    expect(historyOf(player)).toEqual(['alias:home']);
    expect(alias.back(player)).toBe(true);
    expect(extension.currentLocation(player)?.key).toBe('alias:home');
    expect(alias.back(player)).toBe(false);
    alias.closeUi(player);
    expect(extension.currentLocation(player)).toBeUndefined();
  });

  it('shows supplied static references without requiring an owner or Core integration', async () => {
    const screen = { key: 'provided-screen', title: 'provided-title', values: [''], actions: [null] };

    __setDeferredShows(true);
    runtime.registerStaticScreens([screen]);

    expect(alias.navigate(screen.key, player)).toBe(true);
    await vi.waitFor(() => { expect(__lastActionForm()?.titleText).toBe(screen.title); });
    __resolveShow({ canceled: true });
  });

  it('rejects an unknown key without changing history or inferring its owner', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    noteLocation(player.id, { key: 'provided-root', params: { id: 7 } });
    const before = navigationSnapshot(player);

    expect(alias.navigate('unregistered-owner:home', player)).toBe(false);
    expect(navigationSnapshot(player)).toEqual(before);
    expect(warn).toHaveBeenCalled();
  });


});
