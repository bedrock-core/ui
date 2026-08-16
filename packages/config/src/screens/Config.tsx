/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Form, Header, theme } from '@bedrock-core/ore-styled';
import { Fragment, Panel, Text, useExit, type FormValues, type JSX } from '@bedrock-core/ui-runtime';
import { splitBreadcrumb } from './breadcrumbs';
import { FormHeader } from './FormHeader';
import { useCore, usePlayer } from '../context';
import { useTranslation, type CoreResources } from '../i18n';
import { buildNestedPatch, resolveInitialValue } from '../config/nested';
import { filterScope, getScopedSchema, groupByTopLevel, splitScalarsAndLists } from '../config/schema';
import { patchScope } from '../config/values';
import type { EntrySchema } from '../types';
import type { AppScreen } from '../navigation/routes';
import { SectionHeading } from './SectionHeading';
import type { BoundI18n } from '@bedrock-core/i18n';

/** The bound verb set, threaded into `renderField` — a helper, not a component, so no hooks. */
type CoreT = BoundI18n<CoreResources>['t'];

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
  const player = usePlayer();
  const exit = useExit();
  const { t } = useTranslation();
  const { addonId, scope, entityId, breadcrumb, values: currentValues } = route.params;
  // Every read and write from this screen is made on the viewing player's behalf, so the
  // owning addon can refuse what they may not touch even if this screen were reached wrongly.
  const accessor = core.config.of(addonId, { actorId: player.id })!;
  const { scalars, lists } = splitScalarsAndLists(filterScope(getScopedSchema(accessor), scope));

  if (Object.keys(scalars).length === 0) {
    return (
      <Card flexDirection={'column'} padding={0} gap={0}>
        <Header {...splitBreadcrumb(breadcrumb)} onBack={(): void => navigation.goBack()} onClose={exit} />
        <Panel flexGrow={1} justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
          <Text wordBreak={'break-word'}>{`${fontColor.muted}${t($ => $.config.listOnly)}`}</Text>
        </Panel>
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
      {/* One card for the whole modal, header and actions included — the same window frame the
          navigable screens wear. Splitting the body and the buttons across two boxes left the
          Save/Back row floating on the bare dialog background. */}
      <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0} paddingTop={1} paddingBottom={4}>
        <FormHeader title={breadcrumb} />
        <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
          <Fragment>
            {[...groups.entries()].map(([groupName, entries]) => (
              <Panel flexDirection={'column'} gap={spacing.md}>
                {groupName !== ''
                  ? <SectionHeading label={`${groupName.charAt(0).toUpperCase()}${groupName.slice(1)}`} />
                  : null}
                <Fragment>
                  {entries.map(([subKey, entry]) => {
                    const fullKey = groupName ? `${groupName}.${subKey}` : subKey;

                    return (
                      <Panel flexDirection={'column'} gap={spacing.xs}>
                        {renderField(fullKey, entry, resolveInitialValue(fullKey, entry, currentValues), t)}
                        {entry.description
                          ? <Text wordBreak={'break-word'}>{`${fontColor.muted}${entry.description}`}</Text>
                          : null}
                      </Panel>
                    );
                  })}
                </Fragment>
              </Panel>
            ))}
          </Fragment>
          {Object.keys(lists).length > 0
            ? <Text wordBreak={'break-word'}>{`${fontColor.muted}${t($ => $.config.listsElsewhere)}`}</Text>
            : null}
          {/* `Back`, not `Cancel`: the modal's dismiss IS `navigation.goBack()`, and every other
              screen in this stack calls that control back. There is no third control to add — a
              modal form's only buttons are its submit and its dismiss. */}
          <Panel flexDirection={'row'} gap={spacing.sm}>
            <Form.Button type={'submit'} label={t($ => $.action.save)} flex={2} />
            <Form.Button type={'exit'} label={t($ => $.action.back)} variant={'contrast'} flex={1} />
          </Panel>
        </Panel>
      </Card>
    </Form>
  );
}

/**
 * One scalar schema entry as its native modal field. The entry type picks the
 * control (number falls back to a text input when the range is too wide for a
 * usable slider).
 */
function renderField(fullKey: string, entry: EntrySchema, current: unknown, t: CoreT): JSX.Element {
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
          label={`${label} ${fontColor.muted}${t($ => $.field.numberRange, { min, max })}`}
          name={fullKey}
          defaultValue={String(numVal)}
          placeholder={`${fontColor.muted}${t($ => $.field.enterNumber)}`}
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
      placeholder={`${fontColor.muted}${t($ => $.field.enterValue, { label: label.toLowerCase() })}`}
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
