/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Form, Header, theme } from '@bedrock-core/ore-styled';
import { Fragment, Panel, Text, useExit, type FormValues, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { buildNestedPatch, resolveInitialValue } from '../config/nested';
import { filterScope, getScopedSchema } from '../config/schema';
import { patchScope } from '../config/values';
import type { AppScreen } from '../navigation/routes';
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
  const { addonId, scope, entityId, fieldKey, breadcrumb, values: currentValues } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id })!;
  const entry = filterScope(getScopedSchema(accessor), scope)[fieldKey];

  if (!entry) {
    return (
      <Card flexDirection={'column'} padding={0} gap={0}>
        <Header title={{ text: breadcrumb }} onBack={(): void => navigation.goBack()} onClose={exit} />
        <Panel flexGrow={1} justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
          <Text>{`${fontColor.muted}Unknown list setting.`}</Text>
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
      <Panel flexDirection={'column'} gap={spacing.xs} padding={spacing.sm}>
        <Text font={'minecraftTen'} scale={1.5} shadow={true} wordBreak={'break-word'}>{breadcrumb}</Text>
        <Divider />
        {entry.description
          ? <Text wordBreak={'break-word'}>{`${fontColor.muted}${entry.description}`}</Text>
          : null}
      </Panel>
      <Panel flexDirection={'column'} gap={spacing.sm} padding={spacing.sm}>
        <SectionHeading label={'Items'} />
        {items.length === 0
          ? <Text>{`${fontColor.muted}No items yet.`}</Text>
          : (
              <Panel flexDirection={'column'} gap={spacing.xs}>
                <Text>{`${fontColor.muted}Uncheck an item to remove it:`}</Text>
                <Fragment>
                  {items.map((item, index) => (
                    <Form.Checkbox label={item} name={`keep.${String(index)}`} defaultValue={true} />
                  ))}
                </Fragment>
              </Panel>
            )}
      </Panel>
      <Panel flexDirection={'column'} gap={spacing.sm} padding={spacing.sm}>
        <SectionHeading label={'Add'} />
        {canAdd
          ? (addOptions
              ? <Form.Dropdown label={'Add item'} name={'add'} options={[ADD_NONE, ...addOptions]} defaultValue={ADD_NONE} />
              : <Form.Input label={'Add item'} name={'add'} placeholder={`${fontColor.muted}Enter ${entry.label.toLowerCase()} entry`} />)
          : <Text>{`${fontColor.muted}Maximum of ${String(entry.maxItems)} items reached.`}</Text>}
      </Panel>
      <Panel flexDirection={'row'} gap={spacing.sm} padding={spacing.sm}>
        <Form.Button type={'submit'} label={'Save'} flex={2} />
        <Form.Button type={'exit'} label={'Cancel'} variant={'contrast'} flex={1} />
      </Panel>
    </Form>
  );
}
