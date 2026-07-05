export {
  Form, ModalContext, MODAL_FORM_SLOT_TYPE,
  type FormConfig, type FormProps, type FormValues,
} from './Form';

export { formToggleWriter, type FormToggleProps } from './FormToggle';
export { formSliderWriter, type FormSliderProps } from './FormSlider';
export { formDropdownWriter, type FormDropdownProps } from './FormDropdown';
export { formInlineSelectWriter, type FormInlineSelectProps } from './FormInlineSelect';
export { FormOption, type FormOptionProps } from './FormOption';
export { formInputWriter, type FormInputProps } from './FormInput';
export {
  collectFormButtons, formButtonTitleFields, formButtonWriter,
  type FormButtonKind, type FormButtonProps,
} from './FormButton';

// Slot-type constants live with their components (like the writers); re-exported here
// for external consumers (layout phase, tests). The restriction pass builds its own set
// in validateForm.ts.
export { MODAL_TOGGLE_SLOT_TYPE } from './FormToggle';
export { MODAL_SLIDER_SLOT_TYPE } from './FormSlider';
export { MODAL_DROPDOWN_SLOT_TYPE } from './FormDropdown';
export { MODAL_INLINE_SELECT_SLOT_TYPE } from './FormInlineSelect';
export { MODAL_OPTION_SLOT_TYPE } from './FormOption';
export { MODAL_INPUT_SLOT_TYPE } from './FormInput';
export { MODAL_FORM_BUTTON_SLOT_TYPE } from './FormButton';
