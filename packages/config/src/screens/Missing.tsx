/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * What a screen renders when the thing it was opened for is not there — an addon with no
 * published config schema, or no guide.
 *
 * Not a dead-end card. The List already disables the Config and Guide buttons for an addon that
 * has neither, so arriving here at all means something raced: schemas and guides replicate
 * independently of registration, and a peer that registered a moment ago may not have broadcast
 * one yet. The useful response is the list, not a message — so this bounces back to it, with the
 * addon still selected, and renders nothing on the way.
 */
import { Panel, useEffect, type JSX } from '@bedrock-core/ui-runtime';
import type { NavigationHelpers } from '@bedrock-core/navigation';
import type { AppRoutes } from '../navigation/routes';

export function Missing({ navigation, addonId }: {
  navigation: NavigationHelpers<AppRoutes>;
  addonId?: string;
}): JSX.Element {
  // In an effect, not during render: navigating is a state change, and the navigator must not be
  // mutated while it is rendering the very screen doing the mutating.
  //
  // `reset` rather than `goBack` because there is not always something below — a deep link can
  // put this screen at the bottom of the stack.
  useEffect(() => {
    navigation.reset({
      routes: [{ name: 'List', params: addonId === undefined ? undefined : { selectedId: addonId } }],
      index: 0,
    });
  }, []);

  return <Panel />;
}
