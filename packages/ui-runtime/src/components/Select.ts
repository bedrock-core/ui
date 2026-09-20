import { isModalForm } from '../core/guards';
import { ModalFormError, type Writer } from '../core/types';
import { emitDropdown, emitToggle } from '../core/writers';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, UNSTYLED_TEXTURE, withControl } from './control';
import { labelFontFields, type LabelFont } from './Form/controlPayload';
import {
  fallbackGroupDefaults, isGroupDefaults, isStringArray, optionElements, optionLabelPosition, readOption,
  serializeSelectOption, type GroupOptionDefaults,
} from './Form/optionPayload';
import { MODAL_INLINE_SELECT_SLOT_TYPE } from '../core/fields';
import { useMechanism } from '../hooks/useMechanism';
import { useState } from '../hooks/useState';
import { Button } from './Button';
import { Panel } from './Panel';
import { Text } from './Text';

/** Group-level option style defaults; each `Option` may override its own. */
export interface SelectOptionStyle {
  /** Default idle option background texture. */
  optionBackground?: string;
  /** Default option hover background. */
  optionHover?: string;
  /** Default option selected background. */
  optionSelected?: string;
  /** Default unselected bullet glyph (radio). Empty draws no bullet (segmented). */
  bullet?: string;
  /** Default selected bullet glyph (radio). */
  bulletSelected?: string;
  /** Default unselected bullet glyph shown on hover. Falls back to `bullet`. */
  bulletHover?: string;
  /** Default selected bullet glyph shown on hover. Falls back to `bulletSelected`. */
  bulletSelectedHover?: string;
  /** Default bullet glyph width (px). Default `12`. */
  bulletWidth?: number;
  /** Default bullet glyph height (px). Default `12`. */
  bulletHeight?: number;
  /** Default option label font. */
  optionFont?: LabelFont;
  /** Default option label scale. */
  optionScale?: number;
  /** Default option label alignment (TS-computed into the label position). */
  optionAlign?: 'left' | 'center' | 'right';
  /** Default option label colour, RGB in 0..1. */
  optionColor?: readonly [number, number, number];
  /** Default option label colour while selected. Falls back to `optionColor`. */
  optionColorSelected?: readonly [number, number, number];
  /** How far an option's label sits lower while selected, in px. */
  optionDropSelected?: number;
}

/** What every select takes, whichever number of choices it makes. */
export interface SelectBaseProps extends ControlProps, SelectOptionStyle {
  /** Result key inside a `<Form>`, where it is required; unused where a press is the answer. */
  name?: string;
  /**
   * The `Option` children — each is flex-laid-out by our layout system (position them with
   * the usual layout props), and the build places every option where the layout put it.
   */
  children?: JSX.Node;
}

/** One choice out of the options. */
export interface SingleSelectProps extends SelectBaseProps {
  multiple?: false;
  /**
   * Initial selection as an option VALUE (matched against each `Option`'s `value`, mapped to
   * its index). Defaults to the first option. `onSubmit` reports the selected option's INDEX.
   */
  defaultValue?: string;
  /** The chosen option's `value`, held by the caller. Only where a press reaches script. */
  value?: string;
  /** Called with the chosen option's `value`, where a press reaches script. */
  onChange?: (value: string) => void;
}

/** Any number of choices out of the options, each one on or off by itself. */
export interface MultipleSelectProps extends SelectBaseProps {
  multiple: true;
  /**
   * The options on at first, as VALUES. Defaults to none. `onSubmit` reports the INDICES of the
   * options that are on, in option order.
   */
  defaultValue?: readonly string[];
  /** The chosen options' values, held by the caller. Only where a press reaches script. */
  value?: readonly string[];
  /** Called with the chosen options' values, in option order, where a press reaches script. */
  onChange?: (values: string[]) => void;
}

export type SelectProps = SingleSelectProps | MultipleSelectProps;

/** A value or a set of them, as the set. */
const chosenOf = (value: string | readonly string[] | undefined): string[] =>
  (value === undefined ? [] : typeof value === 'string' ? [value] : [...value]);

/**
 * Inline select group (radio group / toggle-button group), rendered INLINE (all options always
 * visible, no popup). Modal-only; render inside a `<Form>`.
 *
 * One choice rides `ModalFormData.dropdown`, and `onSubmit` receives the selected option's INDEX.
 * Several ride one `ModalFormData.toggle` per option under the same `name`, and `onSubmit`
 * receives the indices that are on.
 *
 * Options are authored as `Option` CHILDREN. Each is laid out by our flex engine (arbitrary
 * position/size), and the build places each option's faces at the rect the layout solved.
 */
const nativeSelect = ({
  name, multiple, defaultValue, value: _value, onChange: _onChange,
  optionBackground, optionHover, optionSelected,
  bullet, bulletSelected, bulletHover, bulletSelectedHover, bulletWidth, bulletHeight,
  optionFont, optionScale, optionAlign, optionColor, optionColorSelected, optionDropSelected,
  children, ...layout
}: SelectProps & { name: string }): JSX.Element => {
  const optionBase = optionBackground ?? UNSTYLED_TEXTURE;
  const groupFont = labelFontFields({ font: optionFont, scale: optionScale });

  // Group-level defaults an option inherits when it doesn't set its own field.
  const groupDefaults: GroupOptionDefaults = {
    background: optionBase,
    backgroundHover: optionHover ?? optionBase,
    backgroundSelected: optionSelected ?? optionBase,
    bulletTexture: bullet ?? '',
    bulletSelectedTexture: bulletSelected ?? '',
    bulletHoverTexture: bulletHover ?? bullet ?? '',
    bulletSelectedHoverTexture: bulletSelectedHover ?? bulletSelected ?? '',
    bulletWidth: bulletWidth ?? 12,
    bulletHeight: bulletHeight ?? 12,
    fontType: groupFont.fontType,
    fontScaleFactor: groupFont.fontScaleFactor,
    align: optionAlign ?? 'left',
    ...optionColor === undefined ? {} : { color: optionColor },
    ...optionColorSelected === undefined ? {} : { colorSelected: optionColorSelected },
    ...optionDropSelected === undefined ? {} : { dropSelected: optionDropSelected },
  };

  return {
    type: MODAL_INLINE_SELECT_SLOT_TYPE,
    // The Option children ride here so the layout phase lays them out (each gets its own
    // jsonUIx/y/w/h). They are NOT serialized as controls — the writer reads their geometry and
    // the serialize walk skips MODAL_OPTION_SLOT_TYPE nodes.
    props: {
      // Full-size top-left container: the cell reserves the group's flow box (from the caller's
      // layout); options position absolutely inside it from their own blob geometry.
      ...withControl(layout),
      children,
    },
    // Group defaults ride the writer-only side channel (never serialized). The writer combines
    // them with each option child's own overrides + post-layout geometry to build the blobs.
    nativeArgs: {
      name,
      // Several choices start from a set of values; one from a single value.
      defaultValue: multiple === true ? chosenOf(defaultValue) : typeof defaultValue === 'string' ? defaultValue : '',
      groupDefaults,
      ...multiple === true ? { multiple: true } : {},
    },
  };
};

/**
 * Choices out of several options, every option visible: one, or any number with `multiple`.
 *
 * Inside a `<Form>` it is the engine's own: one choice is the inline select, reporting the chosen
 * option's INDEX on submit, and several are a native toggle per option, reporting the indices
 * that are on. Where a press reaches script it is one button per `Option`, calling `onChange`
 * with the option's `value`, or with every chosen value when there can be several.
 */
export const Select: FunctionComponent<SelectProps> = (props: SelectProps): JSX.Element => {
  const mechanism = useMechanism('Select');
  const options = optionElements(props.children).map(element => ({
    value: String(element.props.value ?? ''),
    label: String(element.props.label ?? ''),
  }));
  const [internal, setInternal] = useState<string[]>(
    props.multiple === true ? chosenOf(props.defaultValue) : chosenOf(props.defaultValue ?? options[0]?.value),
  );

  if (mechanism === 'field') {
    return nativeSelect({ ...props, name: props.name ?? '' });
  }

  const chosen = props.value === undefined ? internal : chosenOf(props.value);
  const {
    name: _name, multiple: _multiple, defaultValue: _default, value: _value, onChange: _onChange, children: _children,
    optionBackground, optionHover, optionSelected,
    bullet: _bullet, bulletSelected: _bulletSelected, bulletHover: _bulletHover,
    bulletSelectedHover: _bulletSelectedHover, bulletWidth: _bulletWidth, bulletHeight: _bulletHeight,
    optionFont: _optionFont, optionScale: _optionScale, optionAlign: _optionAlign,
    optionColor, optionColorSelected, optionDropSelected: _optionDropSelected,
    ...layout
  } = props;

  const press = (pressed: string): void => {
    if (props.multiple === true) {
      // The pressed option flips; the rest keep their state, in option order.
      const next = options
        .map(option => option.value)
        .filter(value => (value === pressed) !== chosen.includes(value));

      setInternal(next);
      props.onChange?.(next);

      return;
    }

    setInternal([pressed]);
    props.onChange?.(pressed);
  };

  return Panel({
    ...layout,
    children: options.map((option) => {
      const on = chosen.includes(option.value);
      const color = on ? optionColorSelected ?? optionColor : optionColor;

      return Button({
        background: on ? optionSelected ?? optionBackground : optionBackground,
        backgroundHover: optionHover,
        children: Text({ ...color === undefined ? {} : { color }, children: option.label }),
        onPress: () => {
          press(option.value);
        },
      });
    }),
  });
};

// ── Writer ──────────────────────────────────────────────────────────────────────

/**
 * Serialize a `modal-inline-select` into the native modal controls.
 *
 * One choice is the native dropdown, reading each laid-out `Option` child's geometry + data (all
 * option handling lives in optionPayload) — the same `dropdown()` call as the popup dropdown, with
 * only the per-option blobs (carrying flex geometry) differing. Several are one native toggle per
 * option, every one recorded under the select's `name` with its option index, so the presenter
 * gathers the answers into one array.
 */
export const selectWriter: Writer = (payload, form, ctx, _callbacks, props, nativeArgs, children) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('`Select` must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';

  if (nativeArgs?.multiple === true) {
    const on = new Set(isStringArray(nativeArgs.defaultValue) ? nativeArgs.defaultValue : []);

    optionElements(children).forEach((option, member) => {
      const { value } = option.props;

      emitToggle(payload, form, ctx, name, typeof value === 'string' && on.has(value), member);
    });

    return;
  }

  const defaultValue = typeof nativeArgs?.defaultValue === 'string' ? nativeArgs.defaultValue : '';
  const defaults: GroupOptionDefaults = isGroupDefaults(nativeArgs?.groupDefaults)
    ? nativeArgs.groupDefaults
    : { ...fallbackGroupDefaults(), background: UNSTYLED_TEXTURE, backgroundHover: UNSTYLED_TEXTURE, backgroundSelected: UNSTYLED_TEXTURE };

  // The group cell's own layout box — option geometry is encoded relative to it.
  const groupX = typeof props?.jsonUIx === 'number' ? props.jsonUIx : 0;
  const groupY = typeof props?.jsonUIy === 'number' ? props.jsonUIy : 0;

  const opts = optionElements(children).map(el => readOption(el, defaults, groupX, groupY));
  const defaultIndex = Math.max(0, opts.findIndex(o => o.value === defaultValue));

  // One blob per option: style + flex geometry + the TS-COMPUTED label position (alignment
  // left the RP). Left-aligned labels start past a radio bullet (bulletWidth + 4px gap) —
  // the bullet-dependent label offset.
  const encodedOptions = opts.map(o => serializeSelectOption(
    o.text,
    o.style,
    o.geometry,
    optionLabelPosition(
      o.text,
      o.style,
      o.geometry.width,
      o.geometry.height,
      o.style.bulletTexture !== '' ? o.style.bulletWidth + 4 : 4,
    ),
  ));

  emitDropdown(payload, form, ctx, name, encodedOptions, defaultIndex);
};
