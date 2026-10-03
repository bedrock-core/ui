export type {
  Allocation,
  ButtonFace,
  ButtonNode,
  GridNode,
  ImageNode,
  IrDocument,
  IrNode,
  ScrollNode,
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
export { faceOf, facesNamespaceOf } from './face';
export type { FaceDocument } from './face';
export { fill } from './fill';
export { toIr, UnsupportedNodeError } from './toIr';
export type { ToIrOptions } from './toIr';
export { CHEST_HOST, MOUNT_ANCHOR } from './hosts/chest';
export type { ChestHost, RoutedScreen } from './hosts/chest';
export { buildRouter, compileScreen } from './compile';
export type { CompiledScreen, ScreenSpec } from './compile';
export { TEST_METADATA_PATH, TEST_METADATA_VERSION } from './testMetadata';
export type {
  ScreenTestMetadata, TestControlMetadata, TestHost, TestInteraction,
  TestMetadataFile, TestMetadataManifest, TestMetadataScreen, TestName, TestRole,
} from './testMetadata';

// The form host: a screen shown to a player, compiled the same way.
export { compileFormScreen } from './hosts/form/compile';
export type { CompiledFormScreen, FormScreenSpec } from './hosts/form/compile';
export { formRouter, MOUNT_FILE, routerFileOf as formRouterFileOf } from './hosts/form/router';
export type { FormRouting, RoutedFormScreen } from './hosts/form/router';
export { buildFormPack } from './hosts/form/pack';
export type { CompiledFormPack } from './hosts/form/pack';
export { buildContainerPack } from './hosts/chest/pack';
export type { CompiledContainerPack } from './hosts/chest/pack';
export { buildUiPack } from './pack';
export type { CompiledUiPack } from './pack';
