/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button, Card, Form, theme } from '@bedrock-core/ore-styled';
import { Fragment, Panel, Text, type FormValues, type JSX } from '@bedrock-core/ui-runtime';
import { useCore } from '../CoreContext';
import {
  buildNestedPatch,
  filterScope,
  getScopedSchema,
  groupByTopLevel,
  patchScope,
  resolveInitialValue,
  splitScalarsAndLists,
  type EntrySchema,
} from '../configUtils';
import type { AppScreen } from '../routes';

const { spacing, fontColor } = theme.tokens;

/** A number field with a range wider than this falls back to a text input. */
const NUMBER_INLINE_MAX_RANGE = 100;

/**
 * Scope editor: ONE native modal form (`<Form>`) holding every scalar field of the
 * scope. Nothing is staged — the modal is atomic, so all values arrive together in
 * `onSubmit`, where they are converted per the schema and patched in one call.
 * List fields have no native modal control; they are edited on their own screen
 * (`ConfigList`), reachable from `ConfigScope`.
 */
export function Config({ navigation, route }: AppScreen<'Config'>): JSX.Element {
  const core = useCore();
  const { addonId, scope, entityId, breadcrumb, values: currentValues } = route.params;
  const accessor = core.config.of(addonId)!;
  const { scalars, lists } = splitScalarsAndLists(filterScope(getScopedSchema(accessor), scope));

  if (Object.keys(scalars).length === 0) {
    return (
      <Card flexDirection={'column'} padding={12} gap={spacing.sm}>
        <Text font={'minecraftTen'} scale={1.5}>{breadcrumb}</Text>
        <Text>{`${fontColor.muted}This scope only has list settings - pick one from the previous screen.`}</Text>
        <Button onPress={(): void => navigation.goBack()}>{'Back'}</Button>
      </Card>
    );
  }

  function handleSubmit(values: FormValues): void {
    const flat: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(scalars)) {
      const converted = convertValue(entry, values[key]);

      if (converted !== undefined) { flat[key] = converted; }
    }

    patchScope(accessor, scope, entityId, buildNestedPatch(flat));
    navigation.goBack();
  }

  const groups = groupByTopLevel(scalars);

  return (
    <Form onSubmit={handleSubmit} onCancel={(): void => navigation.goBack()}>
      <Panel flexDirection={'column'} gap={2} padding={spacing.sm}>
        <Text font={'minecraftTen'} scale={1.5}>{breadcrumb}</Text>
      </Panel>
      <Fragment>
        {[...groups.entries()].map(([groupName, entries]) => (
          <Panel flexDirection={'column'} gap={spacing.xs} padding={spacing.sm}>
            {groupName !== ''
              ? (
                  <Text font={'minecraftTen'}>{`${fontColor.muted}${groupName.charAt(0).toUpperCase()}${groupName.slice(1)}`}</Text>
                )
              : null}
            <Fragment>
              {entries.map(([subKey, entry]) => {
                const fullKey = groupName ? `${groupName}.${subKey}` : subKey;

                return (
                  <Fragment>
                    {renderField(fullKey, entry, resolveInitialValue(fullKey, entry, currentValues))}
                    {entry.description ? <Text>{`${fontColor.muted}${entry.description}`}</Text> : null}
                  </Fragment>
                );
              })}
            </Fragment>
          </Panel>
        ))}
      </Fragment>
      {Object.keys(lists).length > 0
        ? (
            <Panel padding={spacing.sm}>
              <Text>{`${fontColor.muted}List settings are edited from the previous screen.`}</Text>
            </Panel>
          )
        : null}
      <Panel flexDirection={'row'} gap={spacing.xs} padding={spacing.sm}>
        <Form.Button type={'submit'} label={'Save'} flex={2} />
        <Form.Button type={'exit'} label={'Cancel'} variant={'danger'} flex={1} />
      </Panel>
    </Form>
  );
}

/**
 * One scalar schema entry as its native modal field. The entry type picks the
 * control (number falls back to a text input when the range is too wide for a
 * usable slider).
 */
function renderField(fullKey: string, entry: EntrySchema, current: unknown): JSX.Element {
  const { label } = entry;

  if (entry.type === 'boolean') {
    return <Form.Toggle label={label} name={fullKey} defaultValue={Boolean(current)} />;
  }

  if (entry.type === 'number') {
    const min = entry.min ?? 0;
    const max = entry.max ?? 100;
    const numVal = typeof current === 'number' ? current : Number(current ?? 0);
    const asInput = (max - min) > NUMBER_INLINE_MAX_RANGE;

    if (asInput) {
      return (
        <Form.Input
          label={`${label} ${fontColor.muted}(${String(min)} to ${String(max)})`}
          name={fullKey}
          defaultValue={String(numVal)}
          placeholder={`${fontColor.muted}Enter number`}
        />
      );
    }

    return <Form.Slider label={label} name={fullKey} min={min} max={max} step={entry.step} defaultValue={numVal} />;
  }

  if (entry.type === 'enum' && entry.options) {
    const options = [...entry.options];
    const currentStr = typeof current === 'string' && options.includes(current) ? current : options[0] ?? '';

    return <Form.Dropdown label={label} name={fullKey} options={options} defaultValue={currentStr} />;
  }

  // string (and any unknown future type, best-effort)
  return (
    <Form.Input
      label={label}
      name={fullKey}
      defaultValue={typeof current === 'string' ? current : ''}
      placeholder={`${fontColor.muted}Enter ${label.toLowerCase()}`}
    />
  );
}

/**
 * Convert a submitted modal value back to the schema's value type. The enum
 * dropdown reports the selected INDEX, not the option string; number inputs
 * report text. Returns undefined to skip the key (invalid or missing value).
 */
function convertValue(entry: EntrySchema, raw: string | number | boolean | undefined): unknown {
  if (raw === undefined) { return undefined; }

  if (entry.type === 'boolean') { return Boolean(raw); }

  if (entry.type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw);

    if (!Number.isFinite(n)) { return undefined; }

    const min = entry.min ?? Number.NEGATIVE_INFINITY;
    const max = entry.max ?? Number.POSITIVE_INFINITY;

    return Math.min(max, Math.max(min, n));
  }

  if (entry.type === 'enum') {
    return typeof raw === 'number' ? entry.options?.[raw] : undefined;
  }

  return String(raw);
}
