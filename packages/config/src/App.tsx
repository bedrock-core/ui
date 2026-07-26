/** @jsxImportSource @bedrock-core/ui-runtime */
import { TranslationKeysContext, useRef, type JSX } from '@bedrock-core/ui-runtime';
import { createStackNavigator, NavigationContainer } from '@bedrock-core/navigation';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import type { OpenTarget } from './commands';
import { CoreContext } from './CoreContext';
import { PlayerContext } from './PlayerContext';
import { buildInitialState } from './initialState';
import type { AppRoutes } from './routes';
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
}

type AppStack = ReturnType<typeof createStackNavigator<AppRoutes>>;

export function App({ core, player, target }: AppProps): JSX.Element {
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
            registry fields measure correctly. */}
        <TranslationKeysContext value={core.translations.forPlayer(player)}>
          <NavigationContainer initialState={buildInitialState(target)}>
            <Stack.Navigator />
          </NavigationContainer>
        </TranslationKeysContext>
      </PlayerContext>
    </CoreContext>
  );
}
