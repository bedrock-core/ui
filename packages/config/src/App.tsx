/** @jsxImportSource @bedrock-core/ui-runtime */
import { createStackNavigator, NavigationContainer } from '@bedrock-core/navigation';
import type { Runtime } from '@bedrock-core/server-runtime';
import { TranslationContext, useRef, type JSX } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { CoreContext, PlayerContext } from './context';
import { buildInitialState } from './navigation/initialState';
import type { OpenTarget } from './navigation/openTarget';
import type { AppRoutes } from './navigation/routes';
import { isOperator } from './permissions';
import { Config } from './screens/Config';
import { ConfigList } from './screens/ConfigList';
import { ConfigScope as ConfigScopeScreen } from './screens/ConfigScope';
import { ConfirmReset } from './screens/ConfirmReset';
import { EntityList } from './screens/EntityList';
import { Guide } from './screens/Guide';
import { List } from './screens/List';

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
        ConfirmReset,
        Guide,
      },
    });
    stackRef.current = Stack;
  }

  return (
    <CoreContext value={core}>
      <PlayerContext value={player}>
        <TranslationContext value={core.translations.forPlayer(player)}>
          <NavigationContainer initialState={buildInitialState(target, values, isOperator(player))}>
            <Stack.Navigator />
          </NavigationContainer>
        </TranslationContext>
      </PlayerContext>
    </CoreContext>
  );
}
