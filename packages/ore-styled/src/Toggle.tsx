/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Button, Form, ModalFormError, Panel, useMechanism, useState } from '@bedrock-core/ui-runtime';
import { fieldLabel, rowSizing } from './Form/label';
import { theme } from './tokens';

export interface ToggleProps extends ControlProps {
  /**
   * What the answer is called on a screen that reports one by name.
   *
   * The modal's, and required there — a native field with no name has nothing
   * to report under. Ignored where the press itself is the answer.
   */
  name?: string;
  /** Settings-row caption: label on the left, the switch pinned to the right. */
  label?: string;
  /** Which way it starts. */
  defaultValue?: boolean;
  /**
   * Held by the caller instead of by the switch.
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

/**
 * A switch, on whatever screen it is drawn.
 *
 * One component for every host: it asks what a `Toggle` BECOMES here and
 * renders that. On a modal it is the engine's own field, whose answer arrives
 * with the rest at submit; anywhere a press reaches script it is a button that
 * swaps its own faces and calls `onChange`. A screen that can draw neither
 * refuses it at build, in that screen's own words.
 *
 * The look is the same either way, because the look is this layer's and the
 * mechanism is the host's.
 */
export function Toggle({
  name, label, defaultValue = false, on, onChange, enabled = true,
  background, backgroundHover, backgroundPressed, backgroundLocked,
  checkedBackground, checkedHover, checkedLocked,
  ...layout
}: ToggleProps): JSX.Element {
  const t = theme.components.toggle;
  const faces = {
    background: background ?? t.textures.off,
    backgroundHover: backgroundHover ?? t.textures.offHover,
    backgroundLocked: backgroundLocked ?? t.textures.offDisabled,
    checkedBackground: checkedBackground ?? t.textures.on,
    checkedHover: checkedHover ?? t.textures.onHover,
    checkedLocked: checkedLocked ?? t.textures.onDisabled,
  };

  // The surfaces belong to the SWITCH, never to the row panel around it, which
  // is why they are taken out of the layout rest above.
  const control = useMechanism('Toggle') === 'field'
    ? (
        <Form.Toggle
          name={named(name, label)}
          defaultValue={defaultValue}
          enabled={enabled}
          width={t.width}
          height={t.height}
          backgroundPressed={backgroundPressed}
          {...faces}
          {...(label === undefined ? layout : {})}
        />
      )
    : (
        <Pressed
          defaultValue={defaultValue}
          on={on}
          onChange={onChange}
          enabled={enabled}
          backgroundPressed={backgroundPressed}
          {...faces}
          {...(label === undefined ? layout : {})}
        />
      );

  if (label === undefined) {
    return control;
  }

  return (
    <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'} {...rowSizing(layout)} {...layout}>
      {fieldLabel(label, enabled)}
      {control}
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
      `The \`<Toggle${label === undefined ? '' : ` label="${label}"`}>\` inside this \`<Form>\` has no \`name\`. `
      + 'A modal reports every answer at submit, keyed by name, so a field without one has nowhere to report.',
    );
  }

  return name;
}

/** The switch where a press is what reaches script: a button holding its own state. */
function Pressed({
  defaultValue, on, onChange, enabled,
  background, backgroundHover, backgroundPressed, backgroundLocked,
  checkedBackground, checkedHover, checkedLocked,
  ...layout
}: ToggleProps & { defaultValue: boolean; enabled: boolean }): JSX.Element {
  const [internal, setInternal] = useState(defaultValue);
  const isOn = on ?? internal;
  const t = theme.components.toggle;

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
      width={t.width}
      height={t.height}
      background={isOn ? checkedBackground : background}
      backgroundHover={isOn ? checkedHover : backgroundHover}
      backgroundPressed={backgroundPressed ?? (isOn ? background : checkedBackground)}
      backgroundLocked={isOn ? checkedLocked : backgroundLocked}
      onPress={handle}
      enabled={enabled}
      {...layout}
    />
  );
}
