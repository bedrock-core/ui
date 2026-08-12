/** @jsxImportSource @bedrock-core/ui-runtime */
import { TranslationKeysContext, useRef, type JSX } from '@bedrock-core/ui-runtime';
import { createStackNavigator, NavigationContainer } from '@bedrock-core/navigation';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import type { OpenTarget } from './navigation/openTarget';
import { CoreContext, PlayerContext } from './context';
import { buildInitialState } from './navigation/initialState';
import { frameworkGuideKeys } from './frameworkGuideKeys';
import { isOperator } from './permissions';
import type { AppRoutes } from './navigation/routes';
import { List } from './screens/List';
import { ConfigScope as ConfigScopeScreen } from './screens/ConfigScope';
import { EntityList } from './screens/EntityList';
import { Config } from './screens/Config';
import { ConfigList } from './screens/ConfigList';
import { Guide } from './screens/Guide';

export interface AppProps {
  core: Runtime;
  player: Player;
  target: OpenTarget;

  /**
   * Effective values for the scope `target` deep-links into, fetched before mounting. Omit for
   * targets that stop short of a scope; `Config` cannot fetch its own (see `mount.tsx`).
   */
  values?: Record<string, unknown>;
}

type AppStack = ReturnType<typeof createStackNavigator<AppRoutes>>;

export function App({ core, player, target, values }: AppProps): JSX.Element {
  // The navigator is created once per mount — the guide source closes over
  // `core`, and recreating the navigator on re-render would discard screen
  // identity while navigation state lives in the container.
  const stackRef = useRef<AppStack | null>(null);
  let Stack = stackRef.current;

  if (Stack === null) {
    Stack = createStackNavigator<AppRoutes>({
      initialRouteName: 'List',
      screens: {
        List,
        ConfigScope: ConfigScopeScreen,
        EntityList,
        Config,
        ConfigList,
        Guide,
      },
    });
    stackRef.current = Stack;
  }

  return (
    <CoreContext value={core}>
      <PlayerContext value={player}>
        {/* Merged map: local vanilla + own keys, overlaid with every peer addon's published
            keys (core.translations), resolved for THIS player's locale — so cross-addon
            registry fields measure correctly.

            bedrock-core's own keys go underneath. They are in an installed .lang, so the client
            paints them, but no realm registers them — and a key the layout engine cannot resolve
            measures as the key string, sizing the box for `bcg.x.y` and clipping the sentence
            painted into it. Addon keys sit on top and win any collision. */}
        <TranslationKeysContext value={{ ...frameworkGuideKeys, ...core.translations.forPlayer(player) }}>
          <NavigationContainer initialState={buildInitialState(target, values, isOperator(player))}>
            <Stack.Navigator />
          </NavigationContainer>
        </TranslationKeysContext>
      </PlayerContext>
    </CoreContext>
  );
}
