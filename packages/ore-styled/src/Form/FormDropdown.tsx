/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormDropdownProps as PrimitiveFormDropdownProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm, Image, Panel } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn, rowSizing } from './label';

export interface FormDropdownProps extends Omit<PrimitiveFormDropdownProps, 'children'> {
  // `children` stays omitted — it is the one NON-appearance omission here: the ore layer
  // owns the option children, building them from the `options` string array below, so a
  // caller-supplied child could only fight the array. Everything else the theme styles
  // (closed box, popup and option faces, option/current text style) is accepted as an
  // override, with the theme as the fallback.
  /** Caption rendered above the closed box. */
  label?: string;
  /**
   * Selectable options — the ore layer keeps the simple string-array API and maps each
   * entry to a primitive `Form.Option` child (value = label = the string).
   */
  options: string[];
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
 *
 * Every surface the theme paints — the closed box's four faces, the popup card, the
 * option row faces and the option/current text style — is a DEFAULT, not a lock: pass
 * any of them and yours wins (same rule as the non-form components). They are
 * destructured out of the layout rest on purpose: this component is a wrapper Panel
 * (arrow overlay) inside another wrapper for the caption, and the surfaces belong to
 * the native DROPDOWN, never to either panel. The "pressed reuses hover" rule survives
 * an override: a caller's `backgroundHover` also becomes their pressed face unless they
 * set `backgroundPressed`.
 */
export function FormDropdown({
  label, name, options, defaultValue, enabled = true,
  background, backgroundHover, backgroundPressed, backgroundLocked,
  popupBackground, optionBackground, optionHover, optionSelected,
  optionFont, optionScale, optionAlign,
  currentColor, currentFont, currentScale, currentInsetX, currentInsetY,
  ...layout
}: FormDropdownProps): JSX.Element {
  const d = theme.components.dropdown;

  const control = (
    <Panel {...(label === undefined ? { ...rowSizing(layout), ...layout } : { width: '100%' })}>
      <PrimitiveForm.Dropdown
        name={name}
        defaultValue={defaultValue}
        enabled={enabled}
        width={'100%'}
        background={background ?? d.textures.background}
        backgroundHover={backgroundHover ?? d.textures.backgroundHover}
        backgroundPressed={backgroundPressed ?? backgroundHover ?? d.textures.backgroundHover}
        backgroundLocked={backgroundLocked ?? d.textures.backgroundDisabled}
        popupBackground={popupBackground ?? d.textures.popup}
        optionBackground={optionBackground ?? d.textures.option}
        optionHover={optionHover ?? d.textures.optionHover}
        optionSelected={optionSelected ?? d.textures.optionSelected}
        optionFont={optionFont ?? d.textStyle.font}
        optionScale={optionScale ?? d.textStyle.scale}
        optionAlign={optionAlign ?? 'left'}
        currentColor={currentColor ?? (enabled ? d.textStyle.value : d.textStyle.disabled)}
        currentFont={currentFont ?? d.textStyle.font}
        currentScale={currentScale ?? d.textStyle.scale}
        currentInsetX={currentInsetX}
        currentInsetY={currentInsetY}
      >
        {options.map(o => (
          <PrimitiveForm.Option value={o} label={o} />
        ))}
      </PrimitiveForm.Dropdown>
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
