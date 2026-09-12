/** @jsxImportSource @bedrock-core/ui-runtime */
import type { DisplayText } from '@bedrock-core/i18n';
import type { ConfigDefinition, ConfigScopeName } from '@bedrock-core/server-runtime';
import { flattenGroups, flattenSchema } from '@bedrock-core/server-runtime';
import { Card, Checkbox, Divider, Dropdown, Form, Header, Input, Radio, Slider, theme, type TrailSegment } from '@bedrock-core/ore-styled';
import { Panel, Scroll, Text, type FunctionComponent, type JSX, type SubmitEvent } from '@bedrock-core/ui-runtime';
import { FRAME, HEADER_HEIGHT, PADDING, TRAIL_LENGTHS } from './frame';
import { i18n } from '../i18n';
import { buildSectionTree, formEntries, listEntries, type SectionNode } from '../config/schema';
import type { EntrySchema } from '../types';

/**
 * A config screen for the schema it was written against, rather than for every
 * schema there is.
 *
 * The generic editor had to be one shape serving any addon: twelve rows, every
 * field kind stacked in each of them behind a carried visibility, the label
 * sent as live text, and a cap wherever a fixed shape could not follow. None of
 * that is about JSON UI — it is the cost of not knowing the schema.
 *
 * An addon knows its own. The definition is a plain object in its source, so
 * its BUILD can read it and bake one screen per section: the settings that
 * section has, each drawn as the control it is, with its label baked. No cap on
 * rows, none on options, and roughly one modal row per setting instead of ten.
 *
 * A section's settings stay a MODAL, because the engine's typed controls are
 * the only things that edit a value in place and a modal is the only screen
 * that has them. What changes is that the modal is shaped, so it can wear the
 * same frame as the screens that lead to it — the full-screen scroll a
 * serialized modal needed is what kept them apart.
 */

/** What one present fills a shaped screen with. The shape is the schema's; only the values travel. */
export interface LeafModel {
  /** The trail the screen is titled with, one segment per {@link TRAIL_LENGTHS} slot. */
  trail: readonly DisplayText[];
  /** The current value per key, as the section's own paths name them. */
  values: Record<string, unknown>;
  /**
   * What a field offers, where only the present knows.
   *
   * The engine reads a dropdown's options off the modal ROW, not off the bake,
   * so a field whose choices depend on the moment — the items a list has not
   * used yet — is baked as a dropdown and filled here.
   */
  options?: Record<string, readonly string[]>;
  /** Runs with the submitted values before the screen closes. */
  onSubmit?: (values: SubmitEvent['values']) => void;
  /**
   * Where the screen goes when it is left without saving.
   *
   * A modal has exactly two controls, its submit and its dismiss, so there is no
   * third one to navigate with — which makes the dismiss the way BACK rather
   * than the way out. Unset, leaving the screen closes the UI, which is what a
   * modal nothing opened should do.
   */
  onCancel?: () => void;
}

export interface LeafProps {
  model?: LeafModel;
}

/**
 * The field name a setting answers under: its own key.
 *
 * Not its position. The build walks the DEFINITION and the runtime walks the
 * ANNOUNCED schema, and nothing makes those two orders the same forever — a
 * screen keyed by position would answer under the wrong setting the first time
 * they diverged, silently and in the player's saved config.
 */

/** The widest range a slider covers; a number spanning more is typed instead. */
const RANGE_MAX = 100;

/**
 * One setting, as the control it is.
 *
 * Every label is baked: the screen was built for this entry, so nothing about
 * it has to travel. Only the value does, and it rides the modal row the engine
 * reads anyway.
 */
const rowFor = (key: string, entry: EntrySchema, model: LeafModel | undefined): JSX.Element => {
  const name = key;
  const label = entry.label;
  const current = model?.values[key];
  const offered = model?.options?.[key];

  if (entry.type === 'boolean') {
    return <Checkbox name={name} label={label} defaultValue={Boolean(current ?? entry.default)} />;
  }

  if (entry.type === 'number') {
    const min = entry.min ?? 0;
    const max = entry.max ?? 100;
    const value = typeof current === 'number' ? current : Number(current ?? entry.default ?? 0);

    return max - min > RANGE_MAX
      ? <Input name={name} label={label} defaultValue={String(value)} />
      : <Slider name={name} label={label} min={min} max={max} step={entry.step} defaultValue={value} />;
  }

  if (entry.type === 'enum' && entry.options !== undefined) {
    const options = [...offered ?? entry.options];
    const selected = typeof current === 'string' && options.includes(current) ? current : String(entry.default ?? options[0] ?? '');

    // A short list reads better as rows than as a popup to open.
    return options.length <= 3
      ? <Radio name={name} label={label} options={options.map(option => ({ value: option, label: option }))} defaultValue={selected} />
      : <Dropdown name={name} label={label} options={options} defaultValue={selected} />;
  }

  return <Input name={name} label={label} defaultValue={String(current ?? entry.default ?? '')} />;
};

const { spacing } = theme.tokens;

/** Space between the card's border and the regions inside it. */
const BODY_PADDING = spacing.sm;

/** The submit button's row, held below the scroll rather than scrolling with it. */
const ACTION_HEIGHT = 20;

/** The scrollbar's own column, which the content leaves clear. */
const TRACK_WIDTH = 5;

/** The primary button's word, white: a key takes no colour code, so the colour is the label's. */
const SAVE_COLOR: readonly [number, number, number] = [1, 1, 1];

/** Every trail slot, live: a slot the present leaves empty hides with its separator. */
const trailSegments = (trail: readonly DisplayText[]): TrailSegment[] =>
  TRAIL_LENGTHS.map((maxLength, index) => ({ text: trail[index] ?? '', maxLength }));

/**
 * The frame every shaped screen wears, so a leaf sits in the same card the
 * screens before it do: the header and its trail, the settings in a scroll,
 * and the save below it where it stays in reach however long the section is.
 *
 * The header's back control is the form's own dismiss, labelled — a modal has
 * exactly two controls, so the way out and the way back are the same one, and
 * there is none left over for a close.
 */
export const sheet = (model: LeafModel | undefined, rows: readonly [string, EntrySchema][]): JSX.Element => {
  const bodyHeight = FRAME.height - HEADER_HEIGHT - 2 * PADDING;
  const contentWidth = FRAME.width - 2 * PADDING - 2 * BODY_PADDING;
  const scrollHeight = bodyHeight - 2 * BODY_PADDING - ACTION_HEIGHT - spacing.xs;

  return (
    <Form
      onSubmit={({ values: submitted }: SubmitEvent): void => { model?.onSubmit?.(submitted); }}
      onCancel={(): void => { model?.onCancel?.(); }}
    >
      <Card variant={'raised'} width={FRAME.width} height={FRAME.height} flexDirection={'column'} padding={0} gap={0}>
        <Header segments={trailSegments(model?.trail ?? [])} cancel={i18n.key($ => $.action.cancel)} height={HEADER_HEIGHT} />
        <Panel flexDirection={'column'} gap={spacing.xs} padding={BODY_PADDING} height={bodyHeight}>
          <Scroll width={contentWidth} height={scrollHeight}>
            <Panel flexDirection={'column'} gap={spacing.sm} width={contentWidth - TRACK_WIDTH}>
              {rows.map(([key, entry]): JSX.Element => (
                <Panel flexDirection={'column'} gap={spacing.xs}>
                  {rowFor(key, entry, model)}
                  <Divider />
                </Panel>
              ))}
            </Panel>
          </Scroll>
          <Form.Button type={'submit'} width={contentWidth} height={ACTION_HEIGHT} justifyContent={'center'} alignItems={'center'}>
            <Text color={SAVE_COLOR}>{i18n.key($ => $.action.save)}</Text>
          </Form.Button>
        </Panel>
      </Card>
    </Form>
  );
};

/** One section's settings, in the order the schema declares them. */
const leafScreen = (entries: readonly [string, EntrySchema][]): FunctionComponent<LeafProps> =>
  ({ model }: LeafProps): JSX.Element => sheet(model, entries);

/** What one item of a list answers under on its own screen. */
export const ITEM_FIELD = 'item';

/**
 * One item of a list, on a screen shaped for that list.
 *
 * A list has no native modal control, so its items are edited one at a time:
 * a text field where the items are free strings, and a dropdown where they come
 * from a fixed set. Which of the set is still free changes per present, so the
 * options are filled through {@link LeafModel.options} rather than baked.
 */
const itemScreen = (entry: EntrySchema): FunctionComponent<LeafProps> => {
  const itemIsEnum = entry.type === 'multiselect' || entry.itemType === 'enum';
  const row: EntrySchema = itemIsEnum
    ? { type: 'enum', default: '', options: entry.options ?? [], label: entry.label }
    : { type: 'string', default: '', label: entry.label };

  return ({ model }: LeafProps): JSX.Element => sheet(model, [[ITEM_FIELD, row]]);
};

/** Every section of one scope that holds settings, by the path it sits at. */
const sectionsOf = (node: SectionNode, into: Map<string, readonly [string, EntrySchema][]>): Map<string, readonly [string, EntrySchema][]> => {
  const entries = formEntries(node);

  if (entries.length > 0) {
    into.set(node.path, entries);
  }

  for (const child of node.children) {
    sectionsOf(child, into);
  }

  return into;
};

/** Every list of one scope, by the key it sits at: each gets a screen its items are edited on. */
const listsOf = (node: SectionNode, into: Map<string, EntrySchema>): Map<string, EntrySchema> => {
  for (const [key, entry] of listEntries(node)) {
    into.set(key, entry);
  }

  for (const child of node.children) {
    listsOf(child, into);
  }

  return into;
};

/** The screen name one section answers to: its scope and its path, made safe. */
export const leafName = (scope: ConfigScopeName, path: string): string =>
  `config_${scope}${path === '' ? '' : `_${path.replaceAll('.', '_')}`}`;

/** The screen name one list's items answer to. */
export const itemName = (scope: ConfigScopeName, key: string): string => `${leafName(scope, key)}_item`;

/**
 * The screens an addon's own schema becomes, for the filter's `screens` setting.
 *
 * One per section that holds settings, per scope. A section holding only
 * sub-sections is navigation and stays an action screen — those are the same
 * for every addon and ship with the library.
 */
export function configScreens(definition: ConfigDefinition): Record<string, FunctionComponent> {
  const screens: Record<string, FunctionComponent> = {};

  for (const scope of ['server', 'dimension', 'player'] as const) {
    const declared = definition[scope];

    if (declared === undefined) {
      continue;
    }

    const tree = buildSectionTree(flattenSchema(declared), flattenGroups(declared));

    for (const [path, entries] of sectionsOf(tree, new Map())) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the registry keys screens by the component; its props are the present's, never the registry's
      screens[leafName(scope, path)] = leafScreen(entries) as FunctionComponent;
    }

    for (const [key, entry] of listsOf(tree, new Map())) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
      screens[itemName(scope, key)] = itemScreen(entry) as FunctionComponent;
    }
  }

  return screens;
}

/**
 * The shaped screens this addon compiled, by the name their section answers to.
 *
 * A compiled screen is reached through the COMPONENT the build registered, and
 * these components are the addon's own — generated from its schema, baked into
 * its pack. So the addon hands the same record it gave the filter to the config
 * app here, and nothing has to guess which screen a section wants.
 */
let registered: Record<string, FunctionComponent> = {};

/**
 * Tells the config app which shaped screens this addon carries.
 *
 * The record is the one the filter compiled: `export default configScreens(schema)`,
 * imported and handed over. A section with no screen here falls to whatever else
 * can draw it.
 */
export function registerConfigScreens(screens: Record<string, FunctionComponent>): void {
  registered = screens;
}

/** A shaped screen filled with one present's values, for `render()`. */
export const shapedElement = (screen: FunctionComponent, model: LeafModel): JSX.Element =>
  ({ type: screen, props: { model } });

/** The shaped screen for one section, or undefined when this build carries none. */
export function shapedScreen(scope: ConfigScopeName, path: string): FunctionComponent | undefined {
  return registered[leafName(scope, path)];
}

/** The shaped screen one list's items are edited on, or undefined when this build carries none. */
export function shapedItemScreen(scope: ConfigScopeName, key: string): FunctionComponent | undefined {
  return registered[itemName(scope, key)];
}
