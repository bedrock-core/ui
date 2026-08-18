/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button, Card, Divider, Form, Header, MenuRow, theme } from '@bedrock-core/ore-styled';
import { Fragment, Panel, Scroll, Text, useExit, useState, type FormValues, type JSX } from '@bedrock-core/ui-runtime';
import { splitBreadcrumb } from './breadcrumbs';
import { FormHeader } from './FormHeader';
import { useCore, usePlayer } from '../context';
import { useTranslation } from '../i18n';
import { buildNestedPatch, resolveInitialValue } from '../config/nested';
import { filterScope, getScopedSchema } from '../config/schema';
import { patchScope } from '../config/values';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

const { spacing, fontColor } = theme.tokens;

/** Which editor is open over the list, and on what. `null` is the list itself. */
type Editing = { index: number } | 'new' | null;

/**
 * The editor for one list setting.
 *
 * A list is the one entry type with no native modal control, which is why it used to be
 * read-only wherever it appeared — a form has nothing to draw for it, and no third button to
 * route an editor from. A section screen has neither limit, so a list reached from one gets a
 * real editor.
 *
 * A row IS the item: pressing it edits that item, and the button beside it removes that item.
 * Splitting the two is what lets a row be pressed at all — with remove on the row itself there
 * was no gesture left for editing, and the destructive action was the easy one to hit.
 *
 * Every change writes immediately. There is no Save: a list is one flat key holding the whole
 * array, so each edit is already a complete, valid value. Staging them would only add a way to
 * lose work by backing out, for a screen where every action is one press to undo.
 */
export function ConfigList({ navigation, route }: AppScreen<'ConfigList'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const exit = useExit();
  const { t, display } = useTranslation();
  const { addonId, scope, entityId, key, breadcrumb, values } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id });
  const entry = accessor ? filterScope(getScopedSchema(accessor), scope)[key] : undefined;
  const [items, setItems] = useState<string[]>(
    entry === undefined ? [] : toItems(resolveInitialValue(key, entry, values)),
  );
  const [editing, setEditing] = useState<Editing>(null);

  if (!accessor || entry === undefined) { return <Missing navigation={navigation} addonId={addonId} />; }

  const listEntry = entry;
  const maxItems = listEntry.maxItems;
  const full = maxItems !== undefined && items.length >= maxItems;
  const isEnum = listEntry.itemType === 'enum' && listEntry.options !== undefined;

  /** Stage and write in one step — see the note above about why there is no Save. */
  function commit(next: string[]): void {
    setItems(next);
    patchScope(accessor!, scope, entityId, buildNestedPatch({ [key]: next }));
  }

  /**
   * What an enum-item list may still offer. Everything already in is excluded — except the item
   * being edited, which has to stay in its own dropdown or that row could not keep its value.
   */
  function optionsFor(index: number | undefined): string[] | undefined {
    if (!isEnum) { return undefined; }

    const taken = new Set(index === undefined ? items : items.filter((_, i) => i !== index));

    return [...listEntry.options ?? []].filter(o => !taken.has(o));
  }

  const canAdd = !full && (optionsFor(undefined)?.length ?? 1) > 0;

  // The editor is a native modal presented over this screen, returning to it either way — a
  // text field for a string-item list, since there is no other way to type one, and a dropdown
  // of what is still available for an enum-item list.
  if (editing !== null) {
    const index = editing === 'new' ? undefined : editing.index;
    const current = index === undefined ? '' : items[index] ?? '';

    const apply = (item: string): void => {
      setEditing(null);

      if (item === '') { return; }

      if (index === undefined) {
        // A duplicate is dropped rather than reported: the enum path cannot produce one (used
        // options are not offered), so the only way here is retyping a string already in.
        if (!items.includes(item)) { commit([...items, item]); }

        return;
      }

      if (items.includes(item) && items[index] !== item) { return; }

      commit(items.map((existing, i) => (i === index ? item : existing)));
    };

    return (
      <ItemEditor
        title={index === undefined
          ? t($ => $.list.addTitle, { label: display(listEntry.label) })
          : t($ => $.list.editTitle)}
        submitLabel={index === undefined ? t($ => $.list.add) : t($ => $.list.save)}
        current={current}
        options={optionsFor(index)}
        onApply={apply}
        onCancel={(): void => setEditing(null)}
      />
    );
  }

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Header {...splitBreadcrumb(breadcrumb)} onBack={(): void => navigation.goBack()} onClose={exit} />
      <Panel flexGrow={1} flexDirection={'column'} padding={spacing.sm} gap={spacing.sm}>
        {listEntry.description
          ? <Text wordBreak={'break-word'}>{`${fontColor.muted}${display(listEntry.description)}`}</Text>
          : null}
        <Panel flexGrow={1}>
          <Scroll>
            <Panel flexDirection={'column'} gap={spacing.xs}>
              {items.length > 0
                ? (
                    <Fragment>
                      {items.map((item, index) => (
                        <ItemRow
                          item={item}
                          onEdit={(): void => setEditing({ index })}
                          onRemove={(): void => commit(items.filter((_, i) => i !== index))}
                        />
                      ))}
                    </Fragment>
                  )
                : <Text wordBreak={'break-word'}>{`${fontColor.muted}${t($ => $.list.empty)}`}</Text>}
            </Panel>
          </Scroll>
        </Panel>
        <Divider />
        {/* Why adding is unavailable is worth a line — a dead button with no reason reads as a
            broken screen rather than as a list with no room left. */}
        {canAdd
          ? null
          : (
              <Text wordBreak={'break-word'}>
                {`${fontColor.muted}${full ? t($ => $.list.full, { max: maxItems ?? 0 }) : t($ => $.list.noOptions)}`}
              </Text>
            )}
        <Button enabled={canAdd} onPress={(): void => setEditing('new')}>{t($ => $.list.add)}</Button>
      </Panel>
    </Card>
  );
}

/**
 * One item: the row edits, the button beside it removes.
 *
 * The same shape as a scope row and its reset control, so a row carrying a second action reads
 * the same way everywhere in this UI.
 */
function ItemRow({ item, onEdit, onRemove }: {
  item: string;
  onEdit: () => void;
  onRemove: () => void;
}): JSX.Element {
  return (
    <Panel flexDirection={'row'} alignItems={'stretch'} gap={spacing.xs}>
      <Panel flexGrow={1}>
        <MenuRow title={item} chevron={false} onPress={onEdit} />
      </Panel>
      <RemoveButton onPress={onRemove} />
    </Panel>
  );
}

/**
 * The remove affordance: the header's close face, which is already this design system's X.
 *
 * Square at whatever height the row turns out to be — `height: '100%'` gives `aspectRatio` a
 * definite axis to transfer, which is what keeps it tracking a one-line and a two-line row
 * alike (see `ResetButton`, same trick for the same reason).
 *
 * No confirmation. Removing one item is one press to put back — the Add button is right there —
 * so a dialog would cost more than the mistake does. Reset-to-defaults still asks, because that
 * one discards every setting at once and cannot be retyped from memory.
 */
function RemoveButton({ onPress }: { onPress: () => void }): JSX.Element {
  const h = theme.components.header;

  return (
    <Button
      height={'100%'}
      aspectRatio={1}
      background={h.textures.close}
      backgroundHover={h.textures.closeHover}
      backgroundPressed={h.textures.closePressed}
      paddingLeft={0}
      paddingRight={0}
      paddingTop={0}
      paddingBottom={0}
      onPress={onPress}
    />
  );
}

/**
 * The add/edit modal. One component for both, because they differ only in their title, their
 * submit label and whether the field starts filled.
 *
 * `options` present means an enum-item list, and the control is a dropdown of what that list may
 * still hold; absent means a string-item list, and it is a text field.
 */
function ItemEditor({ title, submitLabel, current, options, onApply, onCancel }: {
  title: string;
  submitLabel: string;
  current: string;
  options: string[] | undefined;
  onApply: (item: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const choices = options ?? [];
  // The dropdown reports the selected INDEX, exactly as it does in the settings form.
  const submit = (v: FormValues): void => onApply(options === undefined
    ? String(v['item'] ?? '').trim()
    : choices[Number(v['item'] ?? 0)] ?? '');

  return (
    <Form onSubmit={submit} onCancel={onCancel}>
      <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0} paddingTop={1} paddingBottom={4}>
        <FormHeader title={title} back={true} />
        <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
          {options === undefined
            ? <Form.Input label={t($ => $.list.item)} name={'item'} defaultValue={current} />
            : (
                <Form.Dropdown
                  label={t($ => $.list.item)}
                  name={'item'}
                  options={choices}
                  defaultValue={choices.includes(current) ? current : choices[0] ?? ''}
                />
              )}
          <Form.Button type={'submit'} label={submitLabel} />
        </Panel>
      </Card>
    </Form>
  );
}

/** A stored list value as strings — an array already, or the JSON a flat key holds. */
function toItems(value: unknown): string[] {
  if (Array.isArray(value)) { return value.map(String); }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);

      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  }

  return [];
}
