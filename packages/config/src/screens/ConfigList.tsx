/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Form, Header, theme } from '@bedrock-core/ore-styled';
import { Fragment, Panel, Text, useExit, type FormValues, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { useTranslation } from '../i18n';
import { buildNestedPatch, resolveInitialValue } from '../config/nested';
import { filterScope, getScopedSchema } from '../config/schema';
import { patchScope } from '../config/values';
import type { AppScreen } from '../navigation/routes';
import { FormHeader } from './FormHeader';
import { SectionHeading } from './SectionHeading';

const { spacing, fontColor } = theme.tokens;

/** Dropdown sentinel for "add nothing" — enum lists always have a selection. */
const ADD_NONE = '- none -';

/**
 * List-field editor as ONE native modal form: every current item is a checkbox
 * (checked = keep), plus one add control — a text input for free-form string
 * items, or a dropdown of the not-yet-added options for enum items. Submit
 * applies removals and the addition together in a single patch; reopen the
 * screen to add more than one item.
 */
export function ConfigList({ navigation, route }: AppScreen<'ConfigList'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const exit = useExit();
  const { t } = useTranslation();
  const { addonId, scope, entityId, fieldKey, breadcrumb, values: currentValues } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id })!;
  const entry = filterScope(getScopedSchema(accessor), scope)[fieldKey];

  if (!entry) {
    return (
      <Card flexDirection={'column'} padding={0} gap={0}>
        <Header title={breadcrumb} onBack={(): void => navigation.goBack()} onClose={exit} />
        <Panel flexGrow={1} justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
          <Text>{`${fontColor.muted}${t($ => $.config.unknownList)}`}</Text>
        </Panel>
      </Card>
    );
  }

  const current = resolveInitialValue(fieldKey, entry, currentValues);
  const items = Array.isArray(current) ? current.map(String) : [];
  const canAdd = entry.maxItems === undefined || items.length < entry.maxItems;
  const addOptions = entry.itemType === 'enum' && entry.options
    ? entry.options.filter(o => !items.includes(o))
    : undefined;

  function handleSubmit(values: FormValues): void {
    const next = items.filter((_, i) => values[`keep.${String(i)}`] !== false);

    if (canAdd) {
      const added = addOptions
        ? (typeof values.add === 'number' ? [ADD_NONE, ...addOptions][values.add] : undefined)
        : String(values.add ?? '').trim();

      if (added && added !== ADD_NONE && !next.includes(added)) { next.push(added); }
    }

    patchScope(accessor, scope, entityId, buildNestedPatch({ [fieldKey]: JSON.stringify(next) }));
    navigation.goBack();
  }

  return (
    <Form onSubmit={handleSubmit} onCancel={(): void => navigation.goBack()}>
      {/* One card for the whole modal, header and actions included — see `Config`. */}
      <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0}>
        <FormHeader title={breadcrumb} />
        <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
          {entry.description
            ? <Text wordBreak={'break-word'}>{`${fontColor.muted}${entry.description}`}</Text>
            : null}
          <Panel flexDirection={'column'} gap={spacing.sm}>
            <SectionHeading label={t($ => $.list.items)} />
            {items.length === 0
              ? <Text>{`${fontColor.muted}${t($ => $.list.empty)}`}</Text>
              : (
                  <Panel flexDirection={'column'} gap={spacing.xs}>
                    <Text>{`${fontColor.muted}${t($ => $.list.uncheckToRemove)}`}</Text>
                    <Fragment>
                      {items.map((item, index) => (
                        <Form.Checkbox label={item} name={`keep.${String(index)}`} defaultValue={true} />
                      ))}
                    </Fragment>
                  </Panel>
                )}
          </Panel>
          <Panel flexDirection={'column'} gap={spacing.sm}>
            <SectionHeading label={t($ => $.list.add)} />
            {canAdd
              ? (addOptions
                  ? <Form.Dropdown label={t($ => $.list.addItem)} name={'add'} options={[ADD_NONE, ...addOptions]} defaultValue={ADD_NONE} />
                  : <Form.Input label={t($ => $.list.addItem)} name={'add'} placeholder={`${fontColor.muted}${t($ => $.list.addPlaceholder, { label: entry.label.toLowerCase() })}`} />)
              : <Text>{`${fontColor.muted}${t($ => $.list.maxReached, { max: entry.maxItems ?? 0 })}`}</Text>}
          </Panel>
          <Panel flexDirection={'row'} gap={spacing.sm}>
            <Form.Button type={'submit'} label={t($ => $.action.save)} flex={2} />
            <Form.Button type={'exit'} label={t($ => $.action.back)} variant={'contrast'} flex={1} />
          </Panel>
        </Panel>
      </Card>
    </Form>
  );
}
