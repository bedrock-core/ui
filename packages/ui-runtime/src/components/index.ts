// Component utilities
export { withControl, type ControlProps } from './control';
export { type ModalFieldProps } from './modalField';

export {
  type AlignContent, type AlignItems, type AlignSelf,
  type Display, type FlexDirection, type FlexSize,
  type FlexWrap, type JustifyContent, type LayoutProps, type Position,
  type Spacing,
} from './layout';

// Components
export { Background, BACKGROUND_SLOT_TYPE, type BackgroundProps } from './Background';
export { Button, BUTTON_TYPE, isExitButton, type ButtonProps } from './Button';
export {
  Container, CONTAINER_TYPE, containerEntity, containerHandlers,
  type ContainerHandlers, type ContainerProps,
} from './Container';
export { Dropdown, type DropdownProps } from './Dropdown';
export { Expect, EXPECT_SLOT_TYPE, expectedHost, type ExpectProps } from './Expect';
export {
  Form, ModalContext, MODAL_FORM_SLOT_TYPE,
  type FormConfig, type FormProps, type FormValues,
  type FormButtonKind, type FormButtonProps,
  type FormDropdownProps, type FormInlineSelectProps, type FormOptionProps,
  type FormInputProps, type FormSliderProps, type FormToggleProps,
  type SubmitEvent,
} from './Form';
export { Fragment, type FragmentProps } from './Fragment';
export { Image, IMAGE_TYPE, liveTexture, type ImageProps } from './Image';
export {
  Embed, EMBED_SLOT_TYPE, embedMarker, embedPlacementOf, EmbedSlots, embedSlotIndex, embedSlotValue, entryBaseOf, isEmbedRoot, isEmbedSlot,
  type EmbedArea, type EmbedFrame, type EmbedPlacement, type EmbedProps, type EmbedSlotsProps,
} from './Embed';
export { Input, type InputProps } from './Input';
export { Hotbar, PlayerInventory } from './Inventory';
export { List, LIST_SLOT_TYPE, listCapacity, listCount, type ListProps } from './List';
export { Slider, type SliderProps } from './Slider';
export { Panel, PANEL_TYPE, type PanelProps } from './Panel';
export { Tabs, DEFAULT_TAB_HEIGHT } from './Tabs';
export type { TabsProps, TabProps } from './Tabs';
export { Disclosure, DEFAULT_DISCLOSURE_HEADER_HEIGHT } from './Disclosure';
export type { DisclosureProps } from './Disclosure';
export { Screen, SCREEN_TYPE, type ScreenProps } from './Screen';
export { Scroll, SCROLL_SLOT_TYPE, type ScrollAxis, type ScrollProps } from './Scroll';
export {
  Slot, SLOT_CELL, SLOT_TYPE, slotInteractive, slotRole, slotSource, isForeignSlot,
  type SlotProps, type SlotRole, type SlotSource,
} from './Slot';
export {
  SlotGrid, SLOT_GRID_TYPE, slotGridConfig, type SlotGridProps, type SlotGridConfig,
} from './SlotGrid';
export {
  Text, isTextElementType, liveTextLength,
  TEXT_SHADOW_TYPE, TEXT_WRAP_TYPE, TEXT_SHADOW_WRAP_TYPE,
  type TextFont, type TextOverflow, type TextAlign, type TextProps, type TextStyle, type TextWordBreak,
} from './Text';

import { registerComponent } from '../core/componentRegistry';
import { BACKGROUND_SLOT_TYPE } from './Background';
import { } from './Button';
import {
  MODAL_FORM_SLOT_TYPE,
  MODAL_TOGGLE_SLOT_TYPE, MODAL_SLIDER_SLOT_TYPE,
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE,
  MODAL_FORM_BUTTON_SLOT_TYPE,
  formToggleWriter, formSliderWriter, formDropdownWriter, formInlineSelectWriter,
  formInputWriter, formButtonWriter,
} from './Form';
import { EXPECT_SLOT_TYPE } from './Expect';
import { } from './Image';
import { } from './Panel';
import { SCREEN_TYPE } from './Screen';
import { SCROLL_SLOT_TYPE } from './Scroll';
import { TEXT_SHADOW_TYPE, TEXT_SHADOW_WRAP_TYPE, TEXT_WRAP_TYPE } from './Text';

let registered = false;

/**
 * Registers the built-in native component types into the component registry.
 *
 * Idempotent and called from `render()` — the built-ins are guaranteed present
 * before the first serialize/layout pass.
 *
 * The container-screen hosts (`Container`, `Slot`, `SlotGrid`, and the
 * `PlayerInventory`/`Hotbar` wrappers over it) are deliberately absent: they
 * never reach the serializer, and an unregistered type is a concrete box to the
 * layout pass, which is what they are.
 *
 * `Tabs` and `Tabs.Tab` are absent for the same reason, and registering them as
 * TRANSPARENT was a real bug: the layout flattened the group instead of solving
 * its box, so every rect the compiler saw was the 100x100 default and the panes
 * drew on top of the header row.
 */
export function registerNativeComponents(): void {
  if (registered) {
    return;
  }

  registered = true;

  // Drawn controls: the compiled layout draws each from the pack, so they emit
  // nothing at runtime. Registered all the same, because the compiler asks this
  // registry whether a type is structural, and these are not.
  registerComponent('button', {});
  registerComponent('panel', {});
  registerComponent('text', {});
  // Shadowed text: the type routes it to the RP label variant with a literal
  // `shadow: true` (JSON UI `shadow` is load-time, not bindable).
  registerComponent(TEXT_SHADOW_TYPE, {});
  // Localized overflow text: the type routes it to the RP label variant whose
  // width is bound to the control box, so Bedrock wraps the resolved string
  // natively (a localization key cannot be pre-wrapped build-side).
  registerComponent(TEXT_WRAP_TYPE, {});
  registerComponent(TEXT_SHADOW_WRAP_TYPE, {});
  registerComponent('image', {});

  registerComponent('fragment', { transparent: true });
  registerComponent('context-provider', { transparent: true });
  // Scroll wrapper: emits no payload; the layout pass treats each as an independent
  // layout root (its own viewport) and tags its descendants with its scroll index.
  registerComponent(SCROLL_SLOT_TYPE, { transparent: true });

  // The form roots: transparent markers the host registry reads. An action
  // form's `<Screen>` and a modal's `<Form>` have no box; their children are
  // laid out against the canvas.
  registerComponent(SCREEN_TYPE, { transparent: true });
  registerComponent(MODAL_FORM_SLOT_TYPE, { transparent: true });

  // The expected-host marker: draws nothing, checked against the host at build.
  registerComponent(EXPECT_SLOT_TYPE, { transparent: true });

  // Full-screen backdrop: transparent marker with no children/box; the presenters
  // find it and append its texture to the form-title metadata (see Background).
  registerComponent(BACKGROUND_SLOT_TYPE, { transparent: true });

  // Native modal controls — each writer (co-located with its Form.* component) calls
  // the component-supplied `build` against the ModalFormData.
  registerComponent(MODAL_TOGGLE_SLOT_TYPE, { writer: formToggleWriter });
  registerComponent(MODAL_SLIDER_SLOT_TYPE, { writer: formSliderWriter });
  registerComponent(MODAL_DROPDOWN_SLOT_TYPE, { writer: formDropdownWriter });
  registerComponent(MODAL_INLINE_SELECT_SLOT_TYPE, { writer: formInlineSelectWriter });
  registerComponent(MODAL_INPUT_SLOT_TYPE, { writer: formInputWriter });
  // Form action button: participates in layout but consumes NO ModalFormData entry —
  // the presenter encodes it into the form TITLE payload (see FormButton).
  registerComponent(MODAL_FORM_BUTTON_SLOT_TYPE, { writer: formButtonWriter });
}
