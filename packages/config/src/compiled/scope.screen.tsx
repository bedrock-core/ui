/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Dropdown, Form, Input, Slider, Toggle, Trail, type TrailSegment } from '@bedrock-core/ore-styled';
import type { DisplayText } from '@bedrock-core/i18n';
import type { RemoteConfigAccessor } from '@bedrock-core/server-runtime';
import { List, Panel, Text, useExit, type FunctionComponent, type JSX, type SubmitEvent } from '@bedrock-core/ui-runtime';
import { TRAIL_LENGTHS } from './frame';
import { buildNestedPatch } from '../config/nested';
import { buildSectionTree, filterScope, filterScopeGroups, findSection, formEntries, getScopedGroups, getScopedSchema, type SectionNode } from '../config/schema';
import { patchScope } from '../config/values';
import type { ConfigScope as Scope, EntrySchema } from '../types';

/**
 * The config editor as ONE compiled screen every schema fits.
 *
 * A compiled screen's shape is fixed when the addon that ships it is built,
 * and another addon's schema only arrives at runtime. So the screen is a
 * modal of `<List max>` rows, each holding every native field a row may
 * need behind a carried visibility, with the label carried too: the schema
 * decides per present which field a row shows and what it says, and nothing
 * of it is baked. The newest runtime in the world draws everyone's config,
 * exactly as it did when the editor was serialized per present.
 *
 * What a fixed shape cannot follow is capped: a section with more rows than
 * fit, or an entry kind with no row here, keeps the serialized editor.
 *
 * A slider is the one control whose own numbers travel: the engine reads a
 * slider's range, step and value off the modal row rather than off the control,
 * so a compiled slider serves every schema's range without any of them being
 * baked.
 */

/** Rows a section may hold before the serialized editor takes over. */
export const ROWS_MAX = 12;

/** Characters a row's label reserves; it is sent as a key, which the client resolves. */
const LABEL_MAX = 32;

/** The most options a dropdown row draws; more keep the serialized editor. */
const OPTIONS_MAX = 8;

/**
 * The widest range a slider row covers. A number spanning more than this is
 * typed instead: dragging one step out of thousands is not an edit anyone can
 * make.
 */
const RANGE_MAX = 100;

/** One box every field of a row shares, so a row is as tall as one field. */
const FIELD_HEIGHT = 22;

export type RowKind = 'toggle' | 'input' | 'slider' | 'dropdown' | 'heading';

/** One row of the editor: what it says, which field it shows, and the field's starting value. */
export interface ScopeRow {
  key: string;
  /** The entry's label, a key the client resolves. */
  label: DisplayText;
  kind: RowKind;
  toggle?: boolean;
  text?: string;
  options?: readonly string[];
  selected?: string;
  /**
   * A slider row's range and where it starts, from the entry's own schema.
   *
   * Carried rather than baked, and the one place this screen's frozen shape
   * does not bind: the engine takes a slider's range, step and value from the
   * modal ROW it is given, so the numbers below travel per present while the
   * control that reads them was compiled once. What the build bakes is only
   * what the face draws with.
   */
  min?: number;
  max?: number;
  step?: number;
  value?: number;
}

/** What one present fills the screen with. Absent at build, where the shape alone matters. */
export interface ScopeModel {
  /** The trail the editor is titled with, one segment per {@link TRAIL_LENGTHS} slot. */
  trail: readonly DisplayText[];
  rows: ScopeRow[];
  /** Runs with the submitted values before the screen closes. */
  onSubmit?: (values: SubmitEvent['values']) => void;
}

export interface ConfigScopeProps {
  model?: ScopeModel;
}

/** A row that draws nothing: what the build sees, and what pads a short section. */
const EMPTY: ScopeRow = { key: '', label: '', kind: 'heading' };

const trailSegments = (trail: readonly DisplayText[] | undefined): TrailSegment[] =>
  TRAIL_LENGTHS.map((maxLength, index) => ({ text: trail?.[index] ?? '', maxLength }));

/**
 * The screen. Every row is laid out with all of its fields over each other in
 * one box — a hidden field keeps its frozen space otherwise — and the
 * conditionals below become carried visibilities at build.
 */
export const ConfigScope: FunctionComponent<ConfigScopeProps> = ({ model }: ConfigScopeProps): JSX.Element => {
  const exit = useExit();
  const rows = model?.rows ?? [];

  function handleSubmit({ values }: SubmitEvent): void {
    model?.onSubmit?.(values);
    exit();
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0} paddingTop={1} paddingBottom={4}>
        <Trail segments={trailSegments(model?.trail)} marginTop={4} />
        <Panel flexDirection={'column'} gap={4} padding={4}>
          <List
            max={ROWS_MAX}
            items={rows}
            row={(row: ScopeRow | undefined, index: number): JSX.Element => {
              const at = row ?? EMPTY;
              const name = `r${String(index)}`;

              return (
                <Panel flexDirection={'column'} gap={2}>
                  <Text maxLength={LABEL_MAX}>{at.label}</Text>
                  <Panel height={FIELD_HEIGHT}>
                    {at.kind === 'toggle' && <Toggle label={''} name={name} defaultValue={at.toggle === true} position={'absolute'} left={0} top={0} />}
                    {at.kind === 'input' && <Input label={''} name={name} defaultValue={at.text ?? ''} position={'absolute'} left={0} right={0} top={0} height={FIELD_HEIGHT} />}
                    {at.kind === 'slider' && <Slider label={''} name={name} min={at.min ?? 0} max={at.max ?? 1} step={at.step ?? 1} defaultValue={at.value ?? 0} position={'absolute'} left={0} right={0} top={0} />}
                    {at.kind === 'dropdown' && <Dropdown label={''} name={name} options={[...at.options ?? []]} defaultValue={at.selected ?? ''} position={'absolute'} left={0} right={0} top={0} />}
                  </Panel>
                  <Divider />
                </Panel>
              );
            }}
          />
          <Panel flexDirection={'row'} gap={4}>
            <Form.Button type={'submit'} label={'Save'} flex={2} />
            <Form.Button type={'exit'} label={'Close'} flex={1} />
          </Panel>
        </Panel>
      </Card>
    </Form>
  );
};

/** The row an entry becomes, or undefined when no row here can hold it. */
const rowOf = (key: string, entry: EntrySchema, current: unknown): ScopeRow | undefined => {
  const label: DisplayText = { translate: entry.label };

  if (entry.type === 'boolean') {
    return { key, label, kind: 'toggle', toggle: Boolean(current) };
  }

  if (entry.type === 'number') {
    const min = entry.min ?? 0;
    const max = entry.max ?? 100;
    const value = typeof current === 'number' ? current : Number(current ?? 0);

    if (max - min > RANGE_MAX) {
      return { key, label, kind: 'input', text: String(value) };
    }

    return { key, label, kind: 'slider', min, max, step: entry.step ?? 1, value };
  }

  if (entry.type === 'string') {
    return { key, label, kind: 'input', text: typeof current === 'string' ? current : String(current ?? '') };
  }

  if (entry.type === 'enum' && entry.options !== undefined && entry.options.length <= OPTIONS_MAX) {
    const options = entry.options;
    const selected = typeof current === 'string' && options.includes(current) ? current : options[0] ?? '';

    return { key, label, kind: 'dropdown', options, selected };
  }

  return undefined;
};

/** A submitted field, back in the entry's own type. */
const valueOf = (entry: EntrySchema, raw: unknown): unknown => {
  if (entry.type === 'boolean') {
    return Boolean(raw);
  }

  if (entry.type === 'number') {
    const parsed = typeof raw === 'number' ? raw : Number(raw);

    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    // Clamped to the entry's own range: a typed number is whatever was typed,
    // and a slider that spans a wider range than the schema still reports its
    // own end.
    return Math.min(entry.max ?? Number.POSITIVE_INFINITY, Math.max(entry.min ?? Number.NEGATIVE_INFINITY, parsed));
  }

  if (entry.type === 'enum') {
    return typeof raw === 'string' && entry.options?.includes(raw) ? raw : undefined;
  }

  return typeof raw === 'string' ? raw : undefined;
};

/**
 * What one section of one scope fills the screen with, or undefined when the
 * section holds something no row here can draw — then the serialized editor
 * shows it, exactly as before.
 */
export function scopeModel(
  accessor: RemoteConfigAccessor,
  destination: { scope: Scope; entityId?: string; path?: string; trail: readonly DisplayText[] },
  values: Record<string, unknown>,
): ScopeModel | undefined {
  const { scope, entityId, path = '', trail } = destination;
  const root: SectionNode = buildSectionTree(
    filterScope(getScopedSchema(accessor), scope),
    filterScopeGroups(getScopedGroups(accessor), scope),
  );
  const section = findSection(root, path);

  if (section === undefined || section.entries.length !== formEntries(section).length || section.children.length > 0) {
    return undefined;
  }

  const entries = formEntries(section);

  if (entries.length === 0 || entries.length > ROWS_MAX) {
    return undefined;
  }

  const rows: ScopeRow[] = [];

  for (const [key, entry] of entries) {
    const row = rowOf(key, entry, values[key]);

    if (row === undefined) {
      return undefined;
    }

    rows.push(row);
  }

  return {
    trail,
    rows,
    onSubmit: (submitted): void => {
      const flat: Record<string, unknown> = {};

      entries.forEach(([key, entry], index) => {
        const value = valueOf(entry, submitted[`r${String(index)}`]);

        if (value !== undefined) {
          flat[key] = value;
        }
      });

      patchScope(accessor, scope, entityId, buildNestedPatch(flat));
    },
  };
}

/** The editor filled with one present's model, for `render()`. */
export const configScopeElement = (model: ScopeModel): JSX.Element => <ConfigScope model={model} />;
