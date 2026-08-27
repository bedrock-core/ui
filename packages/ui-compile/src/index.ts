export type {
  Allocation,
  ButtonFace,
  ButtonNode,
  GridNode,
  ImageNode,
  IrDocument,
  IrNode,
  ExitNode,
  ScrollNode,
  LabelNode,
  PanelNode,
  Rect,
  SlotNode,
  SlotRole,
  SlotSource,
  TextNode,
} from './ir';

export type {
  Anchor,
  Binding,
  BindingCondition,
  BindingType,
  ButtonMapping,
  Control,
  ControlEntry,
  ControlType,
  Document,
  FontSize,
  Measure,
} from './jsonui';

export { BACKDROP_DEFINITION, emit, SCREEN_DEFINITION } from './emit';
export { toIr, UnsupportedNodeError } from './toIr';
export type { ToIrOptions } from './toIr';
export { CHEST_HOST, MOUNT_ANCHOR } from './hosts/chest';
export type { ChestHost, RoutedScreen } from './hosts/chest';
export { buildRouter, compileScreen } from './compile';
export type { CompiledScreen, ScreenSpec } from './compile';

// The form host: a screen shown to a player, compiled the same way.
export { compileFormScreen } from './hosts/form/compile';
export type { CompiledFormScreen, FormScreenSpec } from './hosts/form/compile';
export { formRouter, MOUNT_FILE, routerFileOf as formRouterFileOf } from './hosts/form/router';
export type { FormRouting, RoutedFormScreen } from './hosts/form/router';
