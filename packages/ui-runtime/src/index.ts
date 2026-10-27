export type { TestProps, TestRole } from './testing';
export { version as UI_VERSION } from '../package.json';

export {
  Background,
  Button,
  Container,
  CONTAINER_TYPE,
  Embed,
  Expect,
  Experimental_OreUI,
  embedMarker,
  EmbedSlots,
  Form,
  MODAL_FORM_SLOT_TYPE,
  Fragment,
  Hotbar,
  Image,
  SelectionPanel,
  Swap,
  ModalContext,
  Panel,
  PlayerInventory,
  Screen,
  SCREEN_TYPE,
  Scroll,
  List,
  Slot,
  SlotGrid,
  Tabs,
  Disclosure,
  Dropdown,
  Input,
  Option,
  Select,
  Slider,
  Text,
  Toggle,
  Trans,
  withControl,
} from './components';

export type {
  AlignContent,
  AlignItems,
  AlignSelf,
  BackgroundProps,
  ButtonProps,
  ContainerHandlers,
  ContainerHost,
  ContainerProps,
  ControlProps,
  Display,
  EmbedArea,
  EmbedFrame,
  EmbedPlacement,
  EmbedProps,
  EmbedSlotsProps,
  ExpectProps,
  ExperimentalOreUIProps,
  FlexDirection,
  FlexSize,
  FlexWrap,
  FormButtonKind,
  FormButtonProps,
  FormConfig,
  FormProps,
  FormValues,
  DropdownProps,
  FragmentProps,
  InputProps,
  OptionProps,
  SelectProps,
  SelectBaseProps,
  SelectOptionStyle,
  SingleSelectProps,
  MultipleSelectProps,
  SliderProps,
  ToggleProps,
  ImageProps,
  JustifyContent,
  LayoutProps,
  SelectionPanelProps,
  SwapProps,
  SwapState,
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
  TransProps,
  TextStyle,
  TextWordBreak,
} from './components';

export {
  useComposed,
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
export type { Compose, Composed, ObservableLike } from './hooks';

// Error classes, caught with `instanceof`.
export {
  ContainerScreenError,
  ModalFormError,
  ScreenRootError,
  SerializationError,
  UncompiledScreenError,
} from './core';

export {
  compiledKeyOf, compiledScreens, screenForKey, registerStaticScreens, staticScreen, staticScreens,
  registerScreenMetadata, screenMetadata, screenMetadataFor, screenMetadataOf, isScreenMetadata, screenParametersError,
  observeRenderLifecycle, renderSession, endRender, withActionMetadata, whyNotPlainData,
} from './core';
export type {
  ScreenMetadata, ScreenParameter, ScreenParameters, StaticScreenRecord,
  RenderSession, RenderEndReason, RenderLifecycleEvent, RenderLifecycleListener, EndRenderOptions,
  ActionMetadataFactory, ActionMetadataContext,
} from './core';
export { resolveStateBackgrounds } from './components/stateBackground';
export type { StateBackgroundProps } from './components/stateBackground';

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
  registerContainerLooks,
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
  ScreenHost,
  SlotEvent,
  UiEvent,
  Writer,
} from './core';

export type {
  FunctionComponent,
  JSX,
} from './jsx';

export { TranslationContext, useTranslation, useTranslationResolver } from './data/Translation';
export type { DisplayText, TranslationResolver } from '@bedrock-core/i18n';

// The glyph table a server measures with before it sends a string: the same one
// the layout uses at build time, so what was solved for and what is sent agree.
export { ellipsizeText, measureText, WIDEST_GLYPH } from './util/textMetrics';
export type { MeasureTextOptions } from './util/textMetrics';

// Entity API, usable on its own: no screen, no component, no host.
export { inventoryOf } from './entity';
export type { ContainerSide, NamedContainer, NamedSlot, SlotLayout } from './entity';

// What scrolling content gives up beside its track, for a screen that sizes its own rows.
export { SCROLL_RESERVE, SCROLL_TRACK_WIDTH } from './components/Scroll';
export { TreeBoundary } from './components/TreeBoundary';
export type { TreeBoundaryProps } from './components/TreeBoundary';
export { useRenderOwner } from './hooks/useRenderOwner';
export { useCompiledData } from './hooks/useCompiledData';
export { withCompileData } from './core/render/data';
export { refreshRender } from './core/render/control';
export { childElements } from './core/guards';
