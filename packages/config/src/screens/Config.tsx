/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Form, Header, theme } from '@bedrock-core/ore-styled';
import { Fragment, Panel, Scroll, Text, useExit, type FormValues, type JSX } from '@bedrock-core/ui-runtime';
import { splitBreadcrumb } from './breadcrumbs';
import { FormHeader } from './FormHeader';
import { useCore, usePlayer } from '../context';
import { useTranslation, type CoreT } from '../i18n';
import { describeList } from '../commands/lists';
import { buildNestedPatch, resolveInitialValue } from '../config/nested';
import { filterScope, getScopedSchema, groupByTopLevel, splitScalarsAndLists } from '../config/schema';
import { patchScope } from '../config/values';
import type { ConfigScope, EntrySchema } from '../types';
import type { AppScreen } from '../navigation/routes';
import { SectionHeading } from './SectionHeading';

const { spacing, fontColor } = theme.tokens;

/** A number field with a range wider than this falls back to a text input. */
const NUMBER_INLINE_MAX_RANGE = 100;

/**
 * Scope editor: ONE native modal form (`<Form>`) holding every scalar field of the
 * scope. Nothing is staged — the modal is atomic, so all values arrive together in
 * `onSubmit`, where they are converted per the schema and patched in one call.
 * List fields have no native modal control, and a modal form has only two buttons —
 * its submit and its dismiss — so there is no third control to route to an editor
 * with. Chat is where they are edited, so the screen names each one, shows what it
 * currently holds, and prints the command that changes it.
 */
export function Config({ navigation, route }: AppScreen<'Config'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const exit = useExit();
  const { t, display } = useTranslation();
  const { addonId, scope, entityId, breadcrumb, values: currentValues } = route.params;
  // Every read and write from this screen is made on the viewing player's behalf, so the
  // owning addon can refuse what they may not touch even if this screen were reached wrongly.
  const accessor = core.config.of(addonId, { actorId: player.id })!;
  const fields = filterScope(getScopedSchema(accessor), scope);
  // Only the scalars round-trip through the form; the lists render read-only beside them.
  const { scalars, lists } = splitScalarsAndLists(fields);
  // Anyone may reach their OWN player scope through `:config`; every other scope and target is
  // `:configat`, which is operator-only and carries the scope inside the key.
  const ownScope = scope === 'player' && entityId === player.id;
  const groups = groupByTopLevel(fields);
  const body = renderGroups(groups, currentValues, addonId, scope, ownScope, t, display);

  // No scalar field means no form: a native modal IS its fields, and one with none to show would
  // present an empty dialog. Any lists still have to be reachable, so they get the plain card.
  if (Object.keys(scalars).length === 0) {
    return (
      <Card flexDirection={'column'} padding={0} gap={0}>
        <Header {...splitBreadcrumb(breadcrumb)} onBack={(): void => navigation.goBack()} onClose={exit} />
        <Panel flexGrow={1} padding={spacing.md}>
          {Object.keys(lists).length > 0
            ? <Scroll>{body}</Scroll>
            : (
                <Panel flexGrow={1} justifyContent={'center'} alignItems={'center'}>
                  <Text wordBreak={'break-word'}>{`${fontColor.muted}${t($ => $.config.empty)}`}</Text>
                </Panel>
              )}
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

  return (
    <Form onSubmit={handleSubmit} onCancel={(): void => navigation.goBack()}>
      {/* One card for the whole modal, header and actions included — the same window frame the
          navigable screens wear. Splitting the body and the buttons across two boxes left the
          Save/Back row floating on the bare dialog background. */}
      <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0} paddingTop={1} paddingBottom={4}>
        <FormHeader title={breadcrumb} />
        <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
          {body}
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
 * Every field of the scope, in the order its addon declared them, grouped by top-level key.
 *
 * A list renders in place like anything else — label, description, current items — but where a
 * scalar gets its native control a list gets the command that edits it instead. There is no
 * control to give it: a list has no native modal field, and a modal form's only buttons are its
 * submit and its dismiss, so there is no third control to route an editor from either.
 */
function renderGroups(
  groups: Map<string, [string, EntrySchema][]>,
  values: Record<string, unknown>,
  addonId: string,
  scope: ConfigScope,
  ownScope: boolean,
  t: CoreT,
  display: (text: string) => string,
): JSX.Element {
  return (
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
                  {entry.type === 'list'
                    ? <Text wordBreak={'break-word'}>{entry.label}</Text>
                    : renderField(fullKey, entry, resolveInitialValue(fullKey, entry, values), t, display)}
                  {entry.description
                    ? <Text wordBreak={'break-word'}>{`${fontColor.muted}${display(entry.description)}`}</Text>
                    : null}
                  {entry.type === 'list'
                    ? (
                        <Fragment>
                          <Text wordBreak={'break-word'}>{describeList(entry, listItems(fullKey, entry, values), t)}</Text>
                          <Text wordBreak={'break-word'}>{`${fontColor.muted}${listCommand(addonId, scope, ownScope, fullKey)}`}</Text>
                        </Fragment>
                      )
                    : null}
                </Panel>
              );
            })}
          </Fragment>
        </Panel>
      ))}
    </Fragment>
  );
}

/** A list field's current items, falling back to the schema default exactly as a scalar field does. */
function listItems(key: string, entry: EntrySchema, values: Record<string, unknown>): string[] {
  const current = resolveInitialValue(key, entry, values);

  return Array.isArray(current) ? current.map(String) : [];
}

/**
 * The chat command that edits one list, spelled for whoever is looking at it. `set` rather than
 * `add`, because it is the verb that works on an empty list and on a full one alike; the guide
 * carries the rest.
 */
function listCommand(addonId: string, scope: ConfigScope, ownScope: boolean, key: string): string {
  return ownScope
    ? `/${addonId}:config set ${key} "<items>"`
    : `/${addonId}:configat set ${scope}.${key} "<items>" [target]`;
}

/**
 * One scalar schema entry as its native modal field. The entry type picks the
 * control (number falls back to a text input when the range is too wide for a
 * usable slider).
 */
function renderField(fullKey: string, entry: EntrySchema, current: unknown, t: CoreT, display: (text: string) => string): JSX.Element {
  // Resolve BEFORE composing: schema labels are often .lang keys, and a key
  // with a §-prefix or a suffix glued on is no longer recognizable as one.
  const label = display(entry.label);

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
