/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormDropdownProps as PrimitiveFormDropdownProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm, Image, Panel, Text } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn, rowSizing } from './label';

export interface FormDropdownProps extends Omit<PrimitiveFormDropdownProps,
  'background' | 'backgroundHover' | 'backgroundPressed' | 'backgroundLocked'
  | 'popupBackground' | 'optionBackground' | 'optionHover' | 'optionSelected'
  | 'optionFont' | 'optionScale' | 'optionAlign'> {
  /** Caption rendered above the closed box. */
  label?: string;
}

/**
 * Ore-styled modal dropdown: the theme's closed-box faces plus the popup surfaces
 * (popup container + option default/hover/selected) on the native `Form.Dropdown`.
 * Option labels use the theme dropdown text style, left-aligned.
 *
 * The closed-box face (selected value left, arrow right — same look as the
 * ActionForm `Dropdown`) is plain JSX overlaid on the control via the modal's
 * decorative label slots. KNOWN LIMIT: the native modal is atomic (no re-render on
 * interaction), so the value text shows the INITIAL selection and does not
 * live-update when the player picks another option.
 */
export function FormDropdown({ label, name, options, defaultValue, enabled = true, ...layout }: FormDropdownProps): JSX.Element {
  const d = theme.components.dropdown;
  const color = enabled ? d.textStyle.value : d.textStyle.disabled;
  const current = defaultValue ?? options[0] ?? '';

  const control = (
    <Panel {...(label === undefined ? { ...rowSizing(layout), ...layout } : { width: '100%' })}>
      <PrimitiveForm.Dropdown
        name={name}
        options={options}
        defaultValue={defaultValue}
        enabled={enabled}
        width={'100%'}
        background={d.textures.background}
        backgroundHover={d.textures.backgroundHover}
        backgroundPressed={d.textures.backgroundHover}
        backgroundLocked={d.textures.backgroundDisabled}
        popupBackground={d.textures.popup}
        optionBackground={d.textures.option}
        optionHover={d.textures.optionHover}
        optionSelected={d.textures.optionSelected}
        optionFont={d.textStyle.font}
        optionScale={d.textStyle.scale}
        optionAlign={'left'}
      />
      <Panel
        position={'absolute'}
        top={0}
        left={0}
        width={'100%'}
        height={'100%'}
        flexDirection={'row'}
        alignItems={'center'}
        gap={theme.components.field.gap}
        paddingLeft={d.padding.x}
        paddingRight={d.padding.x}
      >
        <Text font={d.textStyle.font} scale={d.textStyle.scale} flexGrow={1}>{`${color}${current}`}</Text>
        <Image
          texture={enabled ? d.textures.arrow : d.textures.arrowDisabled}
          width={d.arrow.width}
          height={d.arrow.height}
        />
      </Panel>
    </Panel>
  );

  return labeledColumn(label, enabled, layout, control);
}
