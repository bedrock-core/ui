/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Form } from '@bedrock-core/ore-styled';
import type { RemoteConfigAccessor } from '@bedrock-core/server-runtime';
import { List, Panel, Text, useExit, type FunctionComponent, type JSX, type SubmitEvent } from '@bedrock-core/ui-runtime';
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
 */

/** Rows a section may hold before the serialized editor takes over. */
export const ROWS_MAX = 12;

/** The longest label a row carries; longer ones keep the serialized editor. */
const LABEL_MAX = 32;

/** The most options a dropdown row draws; more keep the serialized editor. */
const OPTIONS_MAX = 8;

/** One box every field of a row shares, so a row is as tall as one field. */
const FIELD_HEIGHT = 22;

export type RowKind = 'toggle' | 'input' | 'dropdown' | 'heading';

/** One row of the editor: what it says, which field it shows, and the field's starting value. */
export interface ScopeRow {
  key: string;
  label: string;
  kind: RowKind;
  toggle?: boolean;
  text?: string;
  options?: readonly string[];
  selected?: string;
}

/** What one present fills the screen with. Absent at build, where the shape alone matters. */
export interface ScopeModel {
  title: string;
  rows: ScopeRow[];
  /** Runs with the submitted values before the screen closes. */
  onSubmit?: (values: SubmitEvent['values']) => void;
}

export interface ConfigScopeProps {
  model?: ScopeModel;
}

/** A row that draws nothing: what the build sees, and what pads a short section. */
const EMPTY: ScopeRow = { key: '', label: '', kind: 'heading' };

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
        <Text font={'minecraftTen'} scale={1.2} marginLeft={6} marginTop={4} maxLength={LABEL_MAX}>{`§0${model?.title ?? ''}`}</Text>
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
                    {at.kind === 'toggle' && <Form.Toggle label={''} name={name} defaultValue={at.toggle === true} position={'absolute'} left={0} top={0} />}
                    {at.kind === 'input' && <Form.Input label={''} name={name} defaultValue={at.text ?? ''} position={'absolute'} left={0} right={0} top={0} height={FIELD_HEIGHT} />}
                    {at.kind === 'dropdown' && <Form.Dropdown label={''} name={name} options={[...at.options ?? []]} defaultValue={at.selected ?? ''} position={'absolute'} left={0} right={0} top={0} />}
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
  if (entry.label.length > LABEL_MAX) {
    return undefined;
  }

  if (entry.type === 'boolean') {
    return { key, label: entry.label, kind: 'toggle', toggle: Boolean(current) };
  }

  if (entry.type === 'number') {
    return { key, label: entry.label, kind: 'input', text: String(typeof current === 'number' ? current : Number(current ?? 0)) };
  }

  if (entry.type === 'string') {
    return { key, label: entry.label, kind: 'input', text: typeof current === 'string' ? current : String(current ?? '') };
  }

  if (entry.type === 'enum' && entry.options !== undefined && entry.options.length <= OPTIONS_MAX) {
    const options = entry.options;
    const selected = typeof current === 'string' && options.includes(current) ? current : options[0] ?? '';

    return { key, label: entry.label, kind: 'dropdown', options, selected };
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

    return Number.isFinite(parsed) ? parsed : undefined;
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
  destination: { scope: Scope; entityId?: string; path?: string; title: string },
  values: Record<string, unknown>,
): ScopeModel | undefined {
  const { scope, entityId, path = '', title } = destination;
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
    title,
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
