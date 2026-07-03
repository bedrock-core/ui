/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormSliderProps as PrimitiveFormSliderProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

export interface FormSliderProps extends Omit<PrimitiveFormSliderProps,
  'background' | 'backgroundHover' | 'backgroundPressed' | 'backgroundLocked'
  | 'progress' | 'progressHover' | 'thumb' | 'thumbHover' | 'thumbPressed' | 'thumbLocked'
  | 'trackHeight' | 'thumbWidth' | 'thumbHeight'> {
  /** Caption rendered above the slider. */
  label?: string;
}

/**
 * Ore-styled modal slider: the theme's track / progress / thumb textures and
 * geometry on the native `Form.Slider`. The modal slider has no disabled-progress
 * state (track + thumb carry the locked faces), so `progressDisabled` is unused here.
 */
export function FormSlider({ label, name, min, max, step, defaultValue, enabled = true, ...layout }: FormSliderProps): JSX.Element {
  const s = theme.components.slider;

  const control = (
    <PrimitiveForm.Slider
      name={name}
      min={min}
      max={max}
      step={step}
      defaultValue={defaultValue}
      enabled={enabled}
      height={s.height}
      background={s.textures.track}
      backgroundLocked={s.textures.trackDisabled}
      progress={s.textures.progress}
      thumb={s.textures.thumb}
      thumbHover={s.textures.thumbHover}
      thumbPressed={s.textures.thumbHover}
      thumbLocked={s.textures.thumbDisabled}
      trackHeight={s.trackHeight}
      thumbWidth={s.thumb.width}
      thumbHeight={s.thumb.height}
      {...(label === undefined ? layout : { width: '100%' })}
    />
  );

  return labeledColumn(label, enabled, layout, control);
}
