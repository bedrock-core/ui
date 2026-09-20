/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Button, ModalFormError, Panel, Toggle as PrimitiveToggle, useMechanism, useState } from '@bedrock-core/ui-runtime';
import { fieldLabel, rowSizing } from './Form/label';

/**
 * A boolean, on whatever screen it is drawn.
 *
 * What a `Toggle` and a `Checkbox` both are: the switch is one implementation,
 * and the two differ only in their textures, their size and which side the
 * caption sits on. Neither is a separate control.
 *
 * One component serves every host because it asks what a `Toggle` BECOMES
 * here. On a modal it is the engine's own field, whose answer arrives with the
 * rest at submit; anywhere a press reaches script it is a button that swaps its
 * own faces and calls `onChange`. A screen that can draw neither refuses it at
 * build, in that screen's own words.
 */

/** The six textures a boolean wears, both states and how each reacts. */
export interface SwitchFaces {
  background: string;
  backgroundHover: string;
  backgroundLocked: string;
  checkedBackground: string;
  checkedHover: string;
  checkedLocked: string;
}

/** What a caller may say about a boolean, whichever shape it wears. */
export interface BooleanProps extends ControlProps {
  /**
   * What the answer is called on a screen that reports one by name.
   *
   * The modal's, and required there — a native field with no name has nothing
   * to report under. Ignored where the press itself is the answer.
   */
  name?: string;
  /** The caption beside it. Without one, the control is drawn bare. */
  label?: string;
  /** Which way it starts. */
  defaultValue?: boolean;
  /**
   * Held by the caller instead of by the control.
   *
   * Only where a press reaches script: a modal delivers every answer at submit,
   * so there is nothing to drive it with while the screen is open.
   */
  on?: boolean;
  /** Called with the new state, on the hosts where a press reaches script. */
  onChange?: (on: boolean) => void;
  enabled?: boolean;
  /** The theme's textures are defaults, not a lock: pass one and yours wins. */
  background?: string;
  backgroundHover?: string;
  backgroundPressed?: string;
  backgroundLocked?: string;
  checkedBackground?: string;
  checkedHover?: string;
  checkedLocked?: string;
}

/** How one shape of boolean is drawn, which is all a `Toggle` and a `Checkbox` differ by. */
export interface SwitchShape {
  width: number;
  height: number;
  faces: SwitchFaces;
  /** Which side of the row the caption sits on, reading order for that shape. */
  caption: 'before' | 'after';
  /** The space between them, when the caption follows the control. */
  gap?: number;
}

export function Switch(
  {
    name, label, defaultValue = false, on, onChange, enabled = true,
    background, backgroundHover, backgroundPressed, backgroundLocked,
    checkedBackground, checkedHover, checkedLocked,
    ...layout
  }: BooleanProps,
  shape: SwitchShape,
): JSX.Element {
  const faces: SwitchFaces = {
    background: background ?? shape.faces.background,
    backgroundHover: backgroundHover ?? shape.faces.backgroundHover,
    backgroundLocked: backgroundLocked ?? shape.faces.backgroundLocked,
    checkedBackground: checkedBackground ?? shape.faces.checkedBackground,
    checkedHover: checkedHover ?? shape.faces.checkedHover,
    checkedLocked: checkedLocked ?? shape.faces.checkedLocked,
  };

  // The surfaces belong to the CONTROL, never to the row panel around it, which
  // is why they are taken out of the layout rest above.
  const box = { width: shape.width, height: shape.height };
  const own = label === undefined ? layout : {};

  const control = useMechanism('Toggle') === 'field'
    ? (
        <PrimitiveToggle
          name={named(name, label)}
          defaultValue={defaultValue}
          enabled={enabled}
          backgroundPressed={backgroundPressed}
          {...box}
          {...faces}
          {...own}
        />
      )
    : (
        <Pressed
          defaultValue={defaultValue}
          on={on}
          onChange={onChange}
          enabled={enabled}
          backgroundPressed={backgroundPressed}
          faces={faces}
          {...box}
          {...own}
        />
      );

  if (label === undefined) {
    return control;
  }

  const caption = fieldLabel(label, enabled);

  return (
    <Panel
      flexDirection={'row'}
      alignItems={'center'}
      justifyContent={shape.caption === 'before' ? 'space-between' : 'flex-start'}
      gap={shape.gap}
      {...rowSizing(layout)}
      {...layout}
    >
      {shape.caption === 'before' ? caption : control}
      {shape.caption === 'before' ? control : caption}
    </Panel>
  );
}

/**
 * The answer's name, which the modal is the one host to need.
 *
 * Refused here rather than defaulted: an unnamed field still draws, still takes
 * the player's answer, and then reports it under a key nothing reads — a
 * silence that looks exactly like the player leaving it alone.
 */
function named(name: string | undefined, label: string | undefined): string {
  if (name === undefined || name === '') {
    throw new ModalFormError(
      `A boolean field${label === undefined ? '' : ` labelled "${label}"`} inside this \`<Form>\` has no \`name\`. `
      + 'A modal reports every answer at submit, keyed by name, so a field without one has nowhere to report.',
    );
  }

  return name;
}

interface PressedProps extends ControlProps {
  defaultValue: boolean;
  on?: boolean;
  onChange?: (on: boolean) => void;
  enabled: boolean;
  backgroundPressed?: string;
  faces: SwitchFaces;
}

/** The boolean where a press is what reaches script: a button holding its own state. */
function Pressed({ defaultValue, on, onChange, enabled, backgroundPressed, faces, ...layout }: PressedProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue);
  const isOn = on ?? internal;

  function handle(): void {
    if (!enabled) {
      return;
    }

    const next = !isOn;

    setInternal(next);
    onChange?.(next);
  }

  return (
    <Button
      background={isOn ? faces.checkedBackground : faces.background}
      backgroundHover={isOn ? faces.checkedHover : faces.backgroundHover}
      backgroundPressed={backgroundPressed ?? (isOn ? faces.background : faces.checkedBackground)}
      backgroundLocked={isOn ? faces.checkedLocked : faces.backgroundLocked}
      onPress={handle}
      enabled={enabled}
      {...layout}
    />
  );
}
