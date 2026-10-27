import type { RawMessage } from '@minecraft/server';
import { fallbackGroupDefaults, isGroupDefaults, optionElements, readOption } from '../../components/Form/optionPayload';
import { MODAL_DROPDOWN_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE, MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE } from '../../core/fields';
import type { JSX } from '../../jsx';

export type OreInput = boolean | number | string;
export interface OreField {
  readonly kind: 'toggle' | 'slider' | 'dropdown' | 'input';
  readonly name?: string;
  readonly label?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly placeholder?: string;
  readonly options?: readonly { readonly value: string; readonly label: string; readonly style?: {
    readonly font: string; readonly scale: number; readonly align: 'left' | 'center' | 'right';
    readonly color?: readonly [number, number, number]; readonly colorSelected?: readonly [number, number, number]; readonly dropSelected?: number;
  }; }[];
  readonly popupHeight?: number;
  readonly surfaces?: Readonly<Record<string, string>>;
  readonly trackHeight?: number;
  readonly thumbWidth?: number;
  readonly thumbHeight?: number;
  readonly font?: string;
  readonly scale?: number;
  readonly inset?: number;
  readonly color?: string;
}

export function oreField(element: JSX.Element): OreField | undefined {
  const kinds: Record<string, OreField['kind']> = { [MODAL_TOGGLE_SLOT_TYPE]: 'toggle', [MODAL_SLIDER_SLOT_TYPE]: 'slider', [MODAL_DROPDOWN_SLOT_TYPE]: 'dropdown', [MODAL_INPUT_SLOT_TYPE]: 'input' };
  const kind = typeof element.type === 'string' ? kinds[element.type] : undefined;

  if (kind === undefined) { return undefined; }

  const args = element.nativeArgs ?? {}, name = args.name;

  if (name !== undefined && (typeof name !== 'string' || name.length > 128)) { throw new Error('An Ore field name must be a string of at most 128 characters.'); }

  const surfaces: Record<string, string> = {};

  for (const key of ['checkedBackground', 'checkedHover', 'checkedLocked', 'progress', 'progressHover', 'thumb', 'thumbHover', 'thumbPressed', 'thumbLocked', 'popupBackground', 'optionBackground', 'optionHover', 'optionSelected']) {
    const value = element.props[key];

    if (typeof value === 'string' && value) { surfaces[key] = value; }
  }

  const defaults = args.groupDefaults;

  if (typeof defaults === 'object' && defaults !== null) {
    for (const [key, prop] of [['optionBackground', 'background'], ['optionHover', 'backgroundHover'], ['optionSelected', 'backgroundSelected']]) {
      const value = Reflect.get(defaults, prop);

      if (typeof value === 'string' && value) { surfaces[key] = value; }
    }
  }

  const options = kind !== 'dropdown'
    ? undefined
    : optionElements(element.props.children).map((option, index) => {
        const data = readOption(option, isGroupDefaults(defaults) ? defaults : fallbackGroupDefaults());

        for (const [key, source] of [['Background', data.style.background], ['Hover', data.style.backgroundHover], ['Selected', data.style.backgroundSelected]]) {
          if (source) { surfaces[`option${index}${key}`] = source; }
        }

        return { value: data.value, label: data.text, style: { font: data.style.fontType, scale: data.style.fontScaleFactor / 2, align: data.style.align,
          ...data.style.color === undefined ? {} : { color: data.style.color },
          ...data.style.colorSelected === undefined ? {} : { colorSelected: data.style.colorSelected },
          ...data.style.dropSelected === undefined ? {} : { dropSelected: data.style.dropSelected } } };
      });

  const field: OreField = { kind, ...name ? { name } : {}, label: typeof element.props.__testName === 'string' ? element.props.__testName : name || kind, surfaces,
    ...kind !== 'slider'
      ? {}
      : { min: finite(args.min), max: finite(args.max), step: args.step === 0 ? 1 : finite(args.step),
          trackHeight: finite(element.props.trackHeight), thumbWidth: finite(element.props.thumbWidth), thumbHeight: finite(element.props.thumbHeight) },
    ...kind !== 'input' ? {} : { placeholder: String(args.placeholder ?? ''), font: String(element.props.valueFontType ?? 'default'), scale: Number(element.props.valueFontScale ?? 2) / 2, inset: Number(element.props.valueX ?? 8) },
    ...kind !== 'dropdown' ? {} : { font: String(element.props.currentFontType ?? 'default'), scale: Number(element.props.currentFontScale ?? 2) / 2, inset: Number(element.props.currentX ?? 8), color: String(element.props.currentColor ?? '') },
    ...kind !== 'dropdown' ? {} : { options, popupHeight: Number(element.props.popupHeight) },
  };

  if (kind === 'slider' && (!(field.max! > field.min!) || !(field.step! > 0))) { throw new Error('Ore sliders require finite min < max and a positive step.'); }

  if (kind === 'dropdown' && (!field.options?.length || field.options.length > 32)) { throw new Error('Ore dropdowns require 1 to 32 options.'); }

  return field;
}

function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) { throw new Error('Ore field geometry and ranges require finite numbers.'); }

  return value;
}

export function oreFieldValue(element: JSX.Element, field: OreField): OreInput {
  const value = element.nativeArgs?.value ?? element.nativeArgs?.defaultValue;
  const initial = field.kind === 'toggle'
    ? value === true
    : field.kind === 'dropdown'
      ? Math.max(0, field.options!.findIndex(option => option.value === value))
      : field.kind === 'slider' ? value ?? field.min! : value ?? '';

  if (!validOreInput(field, initial)) { throw new Error(`Invalid value for Ore field ${field.label}.`); }

  return initial;
}

export function validOreInput(field: OreField, value: unknown): value is OreInput {
  if (field.kind === 'toggle') { return typeof value === 'boolean'; }

  if (field.kind === 'input') { return typeof value === 'string' && value.length <= 512 && Array.from(value).every(char => char.charCodeAt(0) >= 32 || [9, 10, 13].includes(char.charCodeAt(0))); }

  if (typeof value !== 'number' || !Number.isFinite(value)) { return false; }

  if (field.kind === 'dropdown') { return Number.isInteger(value) && value >= 0 && value < field.options!.length; }

  const offset = (value - field.min!) / field.step!;

  return value >= field.min! && value <= field.max! && Math.abs(offset - Math.round(offset)) < 1e-7;
}

/** The client resolves this through the native label, including RawMessage arguments. */
export function oreMessage(element: JSX.Element, key?: string): RawMessage {
  if (key) { return { translate: key }; }

  const value = element.props.value;
  const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : value;

  if (typeof tail === 'object' && tail !== null) { return tail; }

  const metrics = element.props.__textMetrics;

  return typeof metrics === 'object' && metrics !== null && 'isKey' in metrics && metrics.isKey === true
    ? { translate: String(tail ?? '') }
    : { text: String(tail ?? '') };
}
