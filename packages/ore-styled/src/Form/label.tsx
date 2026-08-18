/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel, Text, useTranslationResolver } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';

/**
 * Literal captions carry the state color and weight as §-prefixes; a string the
 * active resolver knows as a .lang key passes through untouched — a prefix
 * would break key resolution (same rule MenuRow follows). Bake the § codes into
 * the authored translation when a localized caption needs them.
 */
function FieldLabel({ label, enabled }: { label: string; enabled: boolean }): JSX.Element {
  const s = theme.components.form.labelStyle;
  const resolver = useTranslationResolver();
  const literal = label === '' || resolver?.(label) === undefined;
  const prefix = `${enabled ? s.color : s.disabledColor}${s.bold ? '§l' : ''}`;

  return <Text font={s.font} scale={s.scale}>{literal ? `${prefix}${label}` : label}</Text>;
}

/**
 * A form field's caption, colored by enabled state. The modal `Form.*` primitives
 * are deliberately label-free — captions are composed here, in the styled layer.
 */
export function fieldLabel(label: string, enabled: boolean): JSX.Element {
  return <FieldLabel label={label} enabled={enabled} />;
}

/**
 * Full-row default shared by the labeled wrappers: fill the row ONLY when the
 * caller gave no sizing (explicit width or any flex sizing must win — a width
 * default would pin the flex-basis and break flex distribution in row panels).
 */
export function rowSizing(layout: ControlProps): Pick<ControlProps, 'width'> {
  const sized = layout.width !== undefined || layout.flex !== undefined
    || layout.flexGrow !== undefined || layout.flexBasis !== undefined;

  return sized ? {} : { width: '100%' };
}

/**
 * "Label above the control" composition (Input / Dropdown / Slider). Unlabeled
 * fields skip the wrapper entirely — the control then carries the caller's layout
 * props itself, so pass `control` already laid out for that case.
 */
export function labeledColumn(
  label: string | undefined,
  enabled: boolean,
  layout: ControlProps,
  control: JSX.Element,
): JSX.Element {
  if (label === undefined) {
    return control;
  }

  return (
    <Panel flexDirection={'column'} gap={theme.components.form.labelGap} {...rowSizing(layout)} {...layout}>
      {fieldLabel(label, enabled)}
      {control}
    </Panel>
  );
}
