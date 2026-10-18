export { navigation } from './core/service';
export { createCoreNavigationAdapter } from './core/adapter';
export type { CoreNavigationAdapter, CoreScreensRegistry, CoreOwnedScreen, CoreOwnedScreen as OwnedScreen } from './core/adapter';
export type { ScreenOpenOptions, ScreenOpener, ServerNavigation } from './core/service';
export { ScreensRegistry } from './core/screens';
export type { ScreenKey } from './static/common';
export type { ScreenMetadata as ScreenDescriptor, ScreenParameters } from '@bedrock-core/ui-runtime';
export { presentReference } from './runtime/reference';
export type { ScreenReference, WalkResult } from './runtime/reference';
