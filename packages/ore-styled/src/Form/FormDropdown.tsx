/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormDropdownProps as PrimitiveFormDropdownProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm, Image, Panel } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn, rowSizing } from './label';

export interface FormDropdownProps extends Omit<PrimitiveFormDropdownProps,
  'background' | 'backgroundHover' | 'backgroundPressed' | 'backgroundLocked'
  | 'popupBackground' | 'optionBackground' | 'optionHover' | 'optionSelected'
  | 'optionFont' | 'optionScale' | 'optionAlign'
  | 'currentColor' | 'currentFont' | 'currentScale' | 'currentInsetX' | 'currentInsetY'> {
  /** Caption rendered above the closed box. */
  label?: string;
}

/**
 * Ore-styled modal dropdown: the theme's closed-box faces plus the popup surfaces
 * (popup container + option default/hover/selected) on the native `Form.Dropdown`.
 * Option labels use the theme dropdown text style, left-aligned.
 *
 * The closed-box face shows the selected value on the left and the arrow on the
 * right (same look as the ActionForm `Dropdown`). The value text is rendered
 * NATIVELY by the RP closed box (reading `#dropdown_option_text`), so it live-updates
 * as the player picks — just like vanilla. Its color/font/scale are passed to the
 * primitive as `current*` props (from the theme dropdown text style); the text is
 * inset a fixed 8px in the RP (matching the input box). Only the arrow is a JSX overlay
 * here (static, pinned right).
 */
export function FormDropdown({ label, name, options, defaultValue, enabled = true, ...layout }: FormDropdownProps): JSX.Element {
  const d = theme.components.dropdown;

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
        currentColor={enabled ? d.textStyle.value : d.textStyle.disabled}
        currentFont={d.textStyle.font}
        currentScale={d.textStyle.scale}
      />
      <Panel
        position={'absolute'}
        top={0}
        left={0}
        width={'100%'}
        height={'100%'}
        flexDirection={'row'}
        alignItems={'center'}
        justifyContent={'flex-end'}
        paddingRight={d.padding.x}
      >
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
