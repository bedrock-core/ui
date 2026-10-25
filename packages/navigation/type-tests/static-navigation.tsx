/** Type-checked public navigation contracts, including rejected inputs. */
import { Button, Panel, Screen, Text, render, type JSX } from '@bedrock-core/ui-runtime';
import {
  CommonActions, Link, StackActions, TabActions, createTopTabNavigator, createTopTabScreen,
  createNavigationContainerRef, createScreenReference, createStackNavigator, createStackScreen, createStaticNavigation,
  useLinkProps, useNavigation, useNavigationState, useRoute, type TopTabBarProps, type HeaderProps, type StaticParamList, type StaticScreenProps,
} from '@bedrock-core/navigation';
import { createCoreNavigationAdapter } from '@bedrock-core/navigation/core';
import { createNavigatorFactory } from '@bedrock-core/navigation/runtime';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';

function ProductScreen({ route }: StaticScreenProps<{ productId: string }>): JSX.Element {
  const navigation = useNavigation('Product');
  const confirmedRoute = useRoute('Product');
  const back = useLinkProps({ action: CommonActions.goBack() });

  return (
    <Panel>
      <Text>{route.params.productId}</Text>
      <Text>{confirmedRoute.params.productId}</Text>
      <Button {...back}><Text>{'Back locally'}</Text></Button>
      <Button onPress={() => navigation.replaceParams({ productId: 'updated' })}>
        <Text>{'Update on the server'}</Text>
      </Button>
    </Panel>
  );
}

function ProductsScreen(): JSX.Element {
  return <Link in={'Products'} screen={'Product'} params={{ productId: 'iron' }}><Text>{'Iron'}</Text></Link>;
}

function SettingsScreen(): JSX.Element {
  return <Panel><Text>{'Settings'}</Text></Panel>;
}

function AboutScreen(): JSX.Element {
  return <Panel><Text>{'About'}</Text></Panel>;
}

const createFramedStack = createNavigatorFactory('stack', ({ children }) => <Panel width={'100%'} height={'100%'}>{children}</Panel>);
export const FramedStack = createFramedStack({ screens: { Product: ProductScreen, About: AboutScreen }, initialRouteName: 'About' });
type FramedParams = StaticParamList<typeof FramedStack>;
export const framedProduct: FramedParams['Product'] = { productId: 'iron' };
// @ts-expect-error Custom factories infer the initial route from their static screens.
createFramedStack({ screens: { About: AboutScreen }, initialRouteName: 'Missing' });
// @ts-expect-error The extension uses the shared stack and tab routers.
createNavigatorFactory('unknown');
// @ts-expect-error Host history mutation is private to the navigation package.
import { pushHistory } from '@bedrock-core/navigation/runtime';
void pushHistory;

const ShopStack = createStackNavigator({
  id: 'Shop',
  initialRouteName: 'Products',
  screens: {
    Products: ProductsScreen,
    Product: createStackScreen({
      screen: ProductScreen,
      options: ({ route }) => ({ title: route.params.productId }),
    }),
  },
});

const HomeTabs = createTopTabNavigator({
  initialRouteName: 'Shop',
  backBehavior: 'history',
  screens: {
    Shop: ShopStack,
    Settings: createTopTabScreen({ screen: SettingsScreen, options: { tabBarLabel: 'Settings' } }),
  },
});

export const RootStack = createStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeTabs,
    Catalog: 'economy:catalog',
    RemoteProduct: 'shop:product',
    Published: createScreenReference(),
  },
  groups: { Help: { screens: { About: AboutScreen }, screenOptions: { headerShown: false } } },
});

type RootStackType = typeof RootStack;
declare module '@bedrock-core/navigation' {
  interface RootNavigator extends RootStackType {}
  interface PublishedScreens {
    'economy:catalog': undefined;
    'shop:product': { productId: string };
  }
}

const Navigation = createStaticNavigation(RootStack, {
  clientNavigation: { mode: 'auto', maxDepth: 5, maxStates: 128, fallback: 'server' },
  rootBackBehavior: 'caller-or-close',
});
const navigationRef = createNavigationContainerRef<typeof RootStack>();

export default function AppScreen(): JSX.Element {
  return <Screen><Navigation ref={navigationRef} /></Screen>;
}

/** Executed on the server; every ref operation is explicitly owned by one player. */
export function openFromCommand(player: Player): void {
  render(AppScreen, player);
}

/** Ref commands target a root that is already mounted for this player. */
export function navigateFromCommand(player: Player): void {
  const navigation = navigationRef.forPlayer(player);

  if (navigation.isReady()) {
    navigation.navigate('Home', { screen: 'Shop', params: { screen: 'Product', params: { productId: 'gold' } } });
  }
}

export function CustomHeader({ backAction }: HeaderProps): JSX.Element {
  return <Link action={backAction}><Text>{'Back'}</Text></Link>;
}

export function CustomTabBar({ actions }: TopTabBarProps): JSX.Element {
  return <Link action={actions.Settings}><Text>{'Settings'}</Text></Link>;
}

/** Supply Core once when constructing the root component; every route keeps the same authoring and navigation APIs. */
export function coreExample(core: Runtime): typeof Navigation {
  return createStaticNavigation(RootStack, { adapter: createCoreNavigationAdapter(core) });
}

/** The same Link opens a discovered screen through the reference route registered above. */
export function discoveredScreenExample(core: Runtime): JSX.Element {
  const adapter = createCoreNavigationAdapter(core);
  const discovered = adapter.screens.all()[0];

  return discovered === undefined ? <Panel /> : <Link screen={'Published'} params={{ screen: discovered.key }} />;
}

/** Compile-only assertions exercise user-visible inference and invalid inputs. */
export function checkTypes(): void {
  const product = useNavigation('Product');

  product.push('Product', { productId: 'iron' });
  product.navigate('About');
  product.jumpTo('Settings');
  product.pushParams({ productId: 'gold' });

  const shop = useNavigation('Shop');

  shop.jumpTo('Settings');
  const root = useNavigation();

  root.navigate('About');

  const initial: StaticParamList<typeof RootStack> = {
    Home: { screen: 'Settings' }, About: undefined, Catalog: undefined,
    RemoteProduct: { productId: 'iron' }, Published: { screen: 'economy:catalog' },
  };

  void initial;
  void <Link screen={'About'} />;
  void <Link screen={'Catalog'} />;
  root.navigate('Catalog');
  product.navigate('RemoteProduct', { productId: 'iron' });
  root.navigate('Published', { screen: 'economy:catalog' });
  void <Link in={'Products'} screen={'Product'} params={{ productId: 'iron' }} />;
  void useLinkProps({ action: StackActions.push('Product', { productId: 'iron' }) });
  void TabActions.jumpTo('Settings');
  void <Link action={TabActions.jumpTo('Settings')} />;
  void <Link action={StackActions.pop()} />;
  void <Link action={CommonActions.pushParams({ productId: 'gold' })} />;
  void <Link screen={'About'} onPress={event => event.preventDefault()} />;
  const stateType: 'stack' = useNavigationState('Product', state => state.type);

  void stateType;
  useNavigation('Settings').addListener('tabPress', event => event.preventDefault());
  createStackNavigator({ groups: { Help: { screens: { About: AboutScreen } } }, initialRouteName: 'About' });
  createStackNavigator({ screens: { About: AboutScreen }, screenOptions: ({ route }) => ({ title: route.name }) });
  const restored: Parameters<typeof Navigation>[0]['initialState'] = {
    routes: [{ name: 'Home', state: { routes: [{ name: 'Shop', state: { routes: [{ name: 'Product', params: { productId: 'iron' } }] } }] } }],
  };

  void restored;

  // @ts-expect-error A required param cannot be omitted.
  product.push('Product');
  // @ts-expect-error Params keep the screen's declared value types.
  product.navigate('Product', { productId: 12 });
  // @ts-expect-error Unknown screen name.
  product.navigate('Missing');
  // @ts-expect-error A named hook must identify a registered screen.
  useNavigation('Missing');
  // @ts-expect-error Root-level links do not implicitly target nested routes.
  void <Link screen={'Product'} params={{ productId: 'iron' }} />;
  // @ts-expect-error A local link must supply required destination params.
  void <Link in={'Products'} screen={'Product'} />;
  // @ts-expect-error Nested params are checked at each level.
  root.navigate('Home', { screen: 'Shop', params: { screen: 'Product', params: { productId: false } } });
  // @ts-expect-error The tab navigator cannot push a screen from its child stack.
  shop.push('Product', { productId: 'iron' });
  // @ts-expect-error Static API only; no empty JSX factory overload.
  createStackNavigator();
  // @ts-expect-error Unknown initial route.
  createStackNavigator({ screens: { About: AboutScreen }, initialRouteName: 'Missing' });
  // @ts-expect-error A link scoped to a navigator does not bubble to ancestor routes.
  void <Link in={'Products'} screen={'About'} />;
  // @ts-expect-error Tab actions target tabs, not screens inside their child stacks.
  TabActions.jumpTo('Product', { productId: 'iron' });
  // @ts-expect-error Stack actions cannot push a tab owned by a tab navigator.
  StackActions.push('Settings');
  // @ts-expect-error A ref must select a player before dispatching navigation.
  navigationRef.navigate('About');
  // @ts-expect-error Static definitions have no JSX registration components.
  void RootStack.Navigator;
  // @ts-expect-error Local Link does not accept external addon keys as route names.
  void <Link screen={'economy:catalog'} />;
  // @ts-expect-error Published destinations are namespaced.
  root.navigate('Published', { screen: 'catalog' });
  // @ts-expect-error popTo accepts merge, not navigate's pop option.
  product.popTo('Product', { productId: 'iron' }, { pop: true });
  // @ts-expect-error A static navigator needs screens or groups.
  createTopTabNavigator({});
  // @ts-expect-error Shorthand screens validate initial params against the component.
  createStackNavigator({ screens: { Product: { screen: ProductScreen, initialParams: { productId: 42 } } } });
  // @ts-expect-error Shorthand screens validate option values too.
  createStackNavigator({ screens: { Product: { screen: ProductScreen, options: { headerShown: 'yes' } } } });
  // @ts-expect-error Group screen options keep their navigator's value types.
  createStackNavigator({ groups: { Help: { screens: { About: AboutScreen }, screenOptions: { headerShown: 'yes' } } } });
  // @ts-expect-error Restored child routes are scoped to the actual nested navigator.
  void <Navigation initialState={{ routes: [{ name: 'Home', state: { routes: [{ name: 'NotAChild' }] } }] }} />;
  // @ts-expect-error Restored leaf params keep their declared types.
  void <Navigation initialState={{ routes: [{ name: 'Home', state: { routes: [{ name: 'Shop', state: { routes: [{ name: 'Product', params: { productId: false } }] } }] } }] }} />;
  // @ts-expect-error Published routes retain the owner-declared param types.
  root.navigate('RemoteProduct', { productId: 42 });
  // @ts-expect-error Published routes require their owner-declared params.
  void <Link screen={'RemoteProduct'} />;
  // @ts-expect-error A dynamic screen reference needs a destination.
  root.navigate('Published');
  // @ts-expect-error Core contributes an adapter, not a second navigation service API.
  void createCoreNavigationAdapter({}).open;
}
