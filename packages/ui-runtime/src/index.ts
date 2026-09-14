export {
  Background,
  Button,
  Container,
  Embed,
  Expect,
  embedMarker,
  EmbedSlots,
  Form,
  Fragment,
  Hotbar,
  Image,
  Link,
  ModalContext,
  Panel,
  PlayerInventory,
  Screen,
  Scroll,
  List,
  Slot,
  SlotGrid,
  Tabs,
  Disclosure,
  Text,
  withControl,
} from './components';

export type {
  AlignContent,
  AlignItems,
  AlignSelf,
  BackgroundProps,
  ButtonProps,
  ContainerHandlers,
  ContainerProps,
  ControlProps,
  Display,
  EmbedArea,
  EmbedFrame,
  EmbedPlacement,
  EmbedProps,
  EmbedSlotsProps,
  ExpectProps,
  FlexDirection,
  FlexSize,
  FlexWrap,
  FormButtonKind,
  FormButtonProps,
  FormConfig,
  FormDropdownProps,
  FormInlineSelectProps,
  FormOptionProps,
  FormInputProps,
  FormProps,
  FormSliderProps,
  FormToggleProps,
  FormValues,
  FragmentProps,
  ImageProps,
  JustifyContent,
  LayoutProps,
  LinkProps,
  ListProps,
  PanelProps,
  Position,
  ScreenProps,
  ScrollProps,
  TabProps,
  TabsProps,
  DisclosureProps,
  SlotProps,
  SlotRole,
  SlotSource,
  SlotGridProps,
  SlotGridConfig,
  Spacing,
  SubmitEvent,
  TextFont,
  TextOverflow,
  TextAlign,
  TextProps,
  TextStyle,
  TextWordBreak,
} from './components';

export {
  useContext,
  useEffect,
  useEvent,
  useExit,
  useMechanism,
  useObservable,
  usePlayer,
  useReducer,
  useRef,
  useState,
} from './hooks';
export type { ObservableLike } from './hooks';

// Error classes, caught with `instanceof`.
export {
  ContainerScreenError,
  ModalFormError,
  ScreenRootError,
  SerializationError,
  TranslationKeysError,
  UncompiledScreenError,
} from './core';

export {
  addonReference,
  back,
  clearHistory,
  closeUi, handOff,
  historyOf,
  shownKey,
  isAddonReference,
  isScreenReference,
  navigate,
  openScreen,
  presentReference,
  registerStaticScreens,
  returnPathOf,
  screenOwner,
  setNavigator,
  pathThrough, setReturnPath,
  clearReturnPath, takeReturnStep,
  compiledKeyOf,
  screenForKey,
  compiledScreens,
} from './core';

export type {
  AddonReference, CompiledScreen, Navigated, NavigateOptions, NavigationDriver, Navigator,
  ReferenceTarget, ReturnAddress, Returner, ScreenKey, ScreenKeys, ScreenReference, WalkResult,
} from './core';

export {
  createContext,
  emitDropdown,
  emitInput,
  emitLabel,
  emitSlider,
  emitToggle,
  getRegisteredTypes,
  isActionForm,
  isModalForm,
  registerComponent,
  registerCompiledScreen,
  compiledSnapshotOf,
  compiledTitleOf,
  render,
} from './core';

export { compiledValuesOf, showCompiledTitle } from './hosts/form/runtime';
export { FLAG_OFF, FLAG_ON } from './hosts/form/contract';

export type {
  ComponentDescriptor,
  CompiledSnapshot,
  Immutable,
  ReducerSlot,
  StateSlot,
  StateUpdate,
  ContainerEvent,
  Context,
  ContextProps,
  FormTarget,
  ModalValue,
  PressEvent,
  RenderOptions,
  SlotEvent,
  UiEvent,
  Writer,
} from './core';

export type {
  FunctionComponent,
  JSX,
} from './jsx';

export { TranslationContext, useTranslation, useTranslationResolver } from './data/Translation';
export type { TranslationResolver } from '@bedrock-core/i18n';

// Entity API, usable on its own: no screen, no component, no host.
export { containerInventory, inventoryOf } from './entity';
export type { Inventory, InventorySlot, SlotContainer, SlotLayout } from './entity';

// What scrolling content gives up beside its track, for a screen that sizes its own rows.
export { SCROLL_RESERVE, SCROLL_TRACK_WIDTH } from './components/Scroll';
