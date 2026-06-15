/** @jsxImportSource @bedrock-core/ui-runtime */
import type { SliderProps as PrimitiveSliderProps, JSX } from '@bedrock-core/ui-runtime';
import { Slider as PrimitiveSlider, Fragment, Panel, useState } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

export interface SliderProps extends Omit<PrimitiveSliderProps, 'face'> {}

export function Slider({
  min,
  max,
  step,
  value,
  defaultValue,
  onChange,
  onCancel,
  label,
  title,
  body,
  submitLabel,
  tooltip,
  enabled = true,
  ...rest
}: SliderProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue ?? min);
  const current = value ?? internal;

  const s = theme.components.slider;
  const ratio = max > min ? (current - min) / (max - min) : 0;
  const pct = Math.min(1, Math.max(0, ratio));

  const trackTex = enabled === false ? s.textures.trackDisabled : s.textures.track;
  const progressTex = enabled === false ? s.textures.progressDisabled : s.textures.progress;

  function handleChange(next: number): void {
    setInternal(next);
    onChange?.(next);
  }

  // The thumb sits in-flow between the progress (filled) and track (unfilled)
  // segments, which share the leftover width by `pct` / `1 - pct`, so the thumb
  // travels [0 .. W-thumbWidth] (left edge flush at min, right edge flush at max,
  // centred at 50%). Each segment also carries a half-thumb basis pulled back by a
  // -half-thumb margin: that keeps the thumb inset while extending progress/track
  // under it so they meet exactly at the thumb's centre (covered by the thumb).
  const half = s.thumb.width / 2;

  return (
    <Panel height={s.height} flexDirection={'row'} alignItems={'center'} {...rest}>
      <Panel background={progressTex} width={half} marginRight={-half} flexGrow={pct} flexShrink={0} height={s.trackHeight} />
      <PrimitiveSlider
        flexShrink={0}
        width={s.thumb.width}
        height={s.thumb.height}
        background={s.textures.thumb}
        backgroundHover={s.textures.thumbHover}
        backgroundPressed={s.textures.thumbHover}
        backgroundLocked={s.textures.thumbDisabled}
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={handleChange}
        onCancel={onCancel}
        label={label}
        title={title}
        body={body}
        submitLabel={submitLabel}
        tooltip={tooltip}
        enabled={enabled}
        face={<Fragment />}
      />
      <Panel background={trackTex} width={half} marginLeft={-half} flexGrow={1 - pct} flexShrink={0} height={s.trackHeight} />
    </Panel>
  );
}
