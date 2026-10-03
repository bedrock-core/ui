import type { Anchor, Binding, BindingCondition, BindingType, ControlType, Measure } from '../jsonui';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };
type Variable = `$${string}` | `#${string}`;
type TemplateBinding = Omit<Binding, 'binding_type' | 'binding_condition'> & {
  binding_type?: BindingType | Variable;
  binding_condition?: BindingCondition | Variable;
};

/** JSON UI controls may bind their geometry and native widget properties. */
export interface TemplateControl {
  type?: ControlType;
  size?: [Measure, Measure] | Variable;
  offset?: [Measure, Measure] | Variable;
  anchor_from?: Anchor | Variable;
  anchor_to?: Anchor | Variable;
  controls?: Record<string, TemplateControl | undefined>[];
  bindings?: TemplateBinding[] | Variable;
  [property: string]: JsonValue | undefined;
}

export interface TemplateContext {
  /** Includes a dependency and returns its addon-owned definition name. */
  ref: (name: string) => string;
}

export interface TemplateDefinition {
  base?: string;
  control: TemplateControl;
}

/** Builders run only when a compiled screen or another builder requests them. */
export type TemplateModule = Record<string, (context: TemplateContext) => TemplateDefinition>;
