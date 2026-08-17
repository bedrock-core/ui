/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormSliderProps as PrimitiveFormSliderProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

export interface FormSliderProps extends PrimitiveFormSliderProps {
  /** Caption rendered above the slider. */
  label?: string;
}

/**
 * Ore-styled modal slider: the theme's track / progress / thumb textures and
 * geometry on the native `Form.Slider`. The modal slider has no disabled-progress
 * state (track + thumb carry the locked faces), so `progressDisabled` is unused here.
 *
 * The texture props — plus the thumb/track geometry that sizes them, which a
 * differently-shaped custom thumb needs — are the theme's DEFAULTS, not a lock: pass
 * any of them and yours wins (same rule as the non-form components). They are
 * destructured out of the layout rest on purpose — a labeled slider is a wrapper
 * column plus the track, and the surfaces belong to the TRACK, never to the column
 * panel. The "pressed thumb reuses hover" rule survives an override: a caller's
 * `thumbHover` also becomes their dragged face unless they set `thumbPressed`.
 */
export function FormSlider({
  label, name, min, max, step, defaultValue, enabled = true,
  background, backgroundHover, backgroundPressed, backgroundLocked,
  progress, progressHover, thumb, thumbHover, thumbPressed, thumbLocked,
  trackHeight, thumbWidth, thumbHeight,
  ...layout
}: FormSliderProps): JSX.Element {
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
      background={background ?? s.textures.track}
      backgroundHover={backgroundHover}
      backgroundPressed={backgroundPressed}
      backgroundLocked={backgroundLocked ?? s.textures.trackDisabled}
      progress={progress ?? s.textures.progress}
      progressHover={progressHover}
      thumb={thumb ?? s.textures.thumb}
      thumbHover={thumbHover ?? s.textures.thumbHover}
      thumbPressed={thumbPressed ?? thumbHover ?? s.textures.thumbHover}
      thumbLocked={thumbLocked ?? s.textures.thumbDisabled}
      trackHeight={trackHeight ?? s.trackHeight}
      thumbWidth={thumbWidth ?? s.thumb.width}
      thumbHeight={thumbHeight ?? s.thumb.height}
      {...(label === undefined ? layout : { width: '100%' })}
    />
  );

  return labeledColumn(label, enabled, layout, control);
}
