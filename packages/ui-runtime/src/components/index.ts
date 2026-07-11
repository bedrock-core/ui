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
export { Button, buttonWriter, type ButtonProps } from './Button';
export { Dropdown, type DropdownProps } from './Dropdown';
export {
  Form, ModalContext, MODAL_FORM_SLOT_TYPE,
  type FormConfig, type FormProps, type FormValues,
  type FormButtonKind, type FormButtonProps,
  type FormDropdownProps, type FormInlineSelectProps, type FormOptionProps,
  type FormInputProps, type FormSliderProps, type FormToggleProps,
} from './Form';
export { Fragment, type FragmentProps } from './Fragment';
export { Image, imageWriter, type ImageProps } from './Image';
export { Input, type InputProps } from './Input';
export { Slider, type SliderProps } from './Slider';
export { ItemRenderer, itemRendererWriter, type ItemRendererProps } from './ItemRenderer';
export { Panel, panelWriter, type PanelProps } from './Panel';
export { Scroll, SCROLL_SLOT_TYPE, MAX_SCROLLS, MAX_POOLED_SCROLLS, type ScrollAxis, type ScrollProps } from './Scroll';
export {
  Text, textWriter, isTextElementType,
  TEXT_SHADOW_TYPE, TEXT_WRAP_TYPE, TEXT_SHADOW_WRAP_TYPE,
  type TextFont, type TextOverflow, type TextProps, type TextStyle, type TextWordBreak,
} from './Text';

import { registerComponent } from '../core/componentRegistry';
import { BACKGROUND_SLOT_TYPE } from './Background';
import { buttonWriter } from './Button';
import {
  MODAL_FORM_SLOT_TYPE,
  MODAL_TOGGLE_SLOT_TYPE, MODAL_SLIDER_SLOT_TYPE,
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE,
  MODAL_FORM_BUTTON_SLOT_TYPE,
  formToggleWriter, formSliderWriter, formDropdownWriter, formInlineSelectWriter,
  formInputWriter, formButtonWriter,
} from './Form';
import { imageWriter } from './Image';
import { itemRendererWriter } from './ItemRenderer';
import { panelWriter } from './Panel';
import { SCROLL_SLOT_TYPE } from './Scroll';
import { TEXT_SHADOW_TYPE, TEXT_SHADOW_WRAP_TYPE, TEXT_WRAP_TYPE, textWriter } from './Text';

let registered = false;

/**
 * Registers the built-in native component types into the component registry.
 *
 * Idempotent and called from `render()` — the built-ins are guaranteed present
 * before the first serialize/layout pass.
 */
export function registerNativeComponents(): void {
  if (registered) {
    return;
  }

  registered = true;

  registerComponent('button', { writer: buttonWriter });
  registerComponent('panel', { writer: panelWriter });
  registerComponent('text', { writer: textWriter });
  // Shadowed text: same writer/payload as `text`; the type routes it to the RP label
  // variant with a literal `shadow: true` (JSON UI `shadow` is load-time, not bindable).
  registerComponent(TEXT_SHADOW_TYPE, { writer: textWriter });
  // Localized overflow text: same writer/payload; the type routes it to the RP label
  // variant whose width is bound to the control box, so Bedrock wraps the resolved
  // string natively (a localization key cannot be pre-wrapped build-side).
  registerComponent(TEXT_WRAP_TYPE, { writer: textWriter });
  registerComponent(TEXT_SHADOW_WRAP_TYPE, { writer: textWriter });
  registerComponent('image', { writer: imageWriter });
  registerComponent('item_renderer', { writer: itemRendererWriter });
  registerComponent('fragment', { transparent: true });
  registerComponent('context-provider', { transparent: true });
  // Scroll wrapper: emits no payload; the layout pass treats each as an independent
  // layout root (its own viewport) and tags its descendants with its scroll index.
  registerComponent(SCROLL_SLOT_TYPE, { transparent: true });

  // Modal form: transparent marker; the presenter detects it on the built tree and
  // switches to the native ModalFormData backend. Its children are walked normally.
  registerComponent(MODAL_FORM_SLOT_TYPE, { transparent: true });

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
