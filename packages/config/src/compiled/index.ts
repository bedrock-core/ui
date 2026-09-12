// The screens live in `.screen.tsx` files: that suffix is what the build's
// conditional sugar rewrites, and their variants are shown by conditionals.
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { ConfirmReset } from './confirm.screen';
import { listItemChoice, listItemText } from './item.screen';
import { AddonList } from './list.screen';
import { MenuList } from './menu.screen';
import { ScopePicker } from './picker.screen';

export * from './confirm.screen';
export * from './frame';
export * from './item.screen';
export * from './list.screen';
export * from './menu.screen';
export * from './page.screen';
export * from './picker.screen';

/** The screens the ui-compiler filter bakes from this package into every addon's pack, by name. */
const screens: Record<string, FunctionComponent> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  addon_list: AddonList as FunctionComponent,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  scope_picker: ScopePicker as FunctionComponent,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  confirm_reset: ConfirmReset as FunctionComponent,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  menu_list: MenuList as FunctionComponent,
  // The fallback for a list whose own addon's shaped screen is not in this
  // bundle, which is every list when the realm drawing config is not the owner.
  list_item_text: listItemText,
  list_item_choice: listItemChoice,
};

export default screens;
