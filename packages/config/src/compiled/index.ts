// The screens live in `.screen.tsx` files: that suffix is what the build's
// conditional sugar rewrites, and their variants are shown by conditionals.
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { AddonList } from './list.screen';
import { ConfigScope } from './scope.screen';

export * from './frame';
export * from './list.screen';
export * from './page.screen';
export * from './scope.screen';

/** The screens the ui-compile filter bakes from this package into every addon's pack, by name. */
const screens: Record<string, FunctionComponent> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the registry keys screens by the component; its props are the present's, never the registry's
  config_scope: ConfigScope as FunctionComponent,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  addon_list: AddonList as FunctionComponent,
};

export default screens;
