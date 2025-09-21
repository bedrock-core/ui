# @bedrock-core/ui Implementation Guide

## Development Roadmap & Implementation Strategy

This guide provides a detailed implementation plan for the `@bedrock-core/ui` system based on the architecture outlined in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Phase 1: Foundation Implementation (Weeks 1-2)

### 1.1 Core Infrastructure Setup

```typescript
// src/core/types.ts
export interface BaseComponent {
  id?: string;
  visible?: boolean;
  enabled?: boolean;
  style?: ComponentStyle;
  bindings?: ComponentBinding[];
  events?: ComponentEvents;
}

export interface ComponentStyle {
  size?: [number | string, number | string];
  offset?: [number, number];
  anchor?: AnchorPosition;
  layer?: number;
  color?: string;
  background?: string;
  border?: BorderStyle;
  opacity?: number;
}

export type AnchorPosition = 
  | 'top_left' | 'top_middle' | 'top_right'
  | 'middle_left' | 'middle_middle' | 'middle_right'
  | 'bottom_left' | 'bottom_middle' | 'bottom_right';

export interface BorderStyle {
  width?: number;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  radius?: number;
}

// src/core/component-registry.ts
export class ComponentRegistry {
  private static components = new Map<string, ComponentDefinition>();
  
  static register<T extends BaseComponent>(
    type: string,
    definition: ComponentDefinition<T>
  ): void {
    this.components.set(type, definition);
  }
  
  static get<T extends BaseComponent>(type: string): ComponentDefinition<T> {
    const definition = this.components.get(type);
    if (!definition) {
      throw new Error(`Component type '${type}' not found`);
    }
    return definition as ComponentDefinition<T>;
  }
}

export interface ComponentDefinition<T extends BaseComponent = BaseComponent> {
  type: string;
  schema: ComponentSchema<T>;
  renderer: ComponentRenderer<T>;
  validator?: ComponentValidator<T>;
}
```

### 1.2 Serialization System Implementation

```typescript
// src/core/serializer.ts
export class UISerializer {
  private static readonly VERSION = '1.0';
  private static readonly MAX_TITLE_LENGTH = 1024;
  private static readonly COMPRESSION_THRESHOLD = 0.8;
  
  static serialize(components: Component[]): string {
    try {
      // Validate components first
      const validation = ComponentValidator.validateUI(components);
      if (!validation.isValid) {
        throw new SerializationError(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      // Convert to compact format
      const compactData = components.map(c => this.compactifyComponent(c));
      
      // Create serialized payload
      const payload: UISerializedData = {
        v: this.VERSION,
        t: 'ui',
        c: this.calculateChecksum(compactData),
        z: false,
        d: compactData
      };
      
      let serialized = JSON.stringify(payload);
      const threshold = this.MAX_TITLE_LENGTH * this.COMPRESSION_THRESHOLD;
      
      // Apply compression if needed
      if (serialized.length > threshold) {
        const compressed = this.compress(serialized);
        if (compressed.length < serialized.length) {
          payload.z = true;
          payload.d = compressed as any;
          serialized = JSON.stringify(payload);
        }
      }
      
      // Final size check
      if (serialized.length > this.MAX_TITLE_LENGTH) {
        throw new SerializationError(
          `UI data (${serialized.length} chars) exceeds title field capacity (${this.MAX_TITLE_LENGTH} chars)`
        );
      }
      
      return `bedrock_ui:${serialized}`;
    } catch (error) {
      if (error instanceof UIError) throw error;
      throw new SerializationError(`Serialization failed: ${error.message}`);
    }
  }
  
  static deserialize(titleData: string): Component[] {
    try {
      if (!titleData.startsWith('bedrock_ui:')) {
        throw new DeserializationError('Invalid title data format - missing bedrock_ui prefix');
      }
      
      const jsonData = titleData.slice(11);
      let payload: UISerializedData;
      
      try {
        const parsed = JSON.parse(jsonData);
        payload = parsed.z ? 
          { ...parsed, d: JSON.parse(this.decompress(parsed.d)) } : 
          parsed;
      } catch (e) {
        throw new DeserializationError(`JSON parse failed: ${e.message}`);
      }
      
      // Version compatibility check
      if (payload.v !== this.VERSION) {
        console.warn(`UI data version mismatch: expected ${this.VERSION}, got ${payload.v}`);
      }
      
      // Verify checksum
      if (payload.c !== this.calculateChecksum(payload.d)) {
        throw new DeserializationError('UI data integrity check failed - data may be corrupted');
      }
      
      return payload.d.map(c => this.expandComponent(c));
    } catch (error) {
      if (error instanceof UIError) throw error;
      throw new DeserializationError(`Deserialization failed: ${error.message}`);
    }
  }
  
  private static compactifyComponent(component: Component): CompactComponent {
    const registry = ComponentRegistry.get(component.type);
    const compact: CompactComponent = {
      t: this.getComponentTypeId(component.type),
      p: registry.schema.compactify(component)
    };
    
    if (component.id) compact.i = component.id;
    if ('children' in component && component.children) {
      compact.c = component.children.map(c => this.compactifyComponent(c));
    }
    
    return compact;
  }
  
  private static expandComponent(compact: CompactComponent): Component {
    const typeName = this.getComponentTypeName(compact.t);
    const registry = ComponentRegistry.get(typeName);
    const component = registry.schema.expand(compact.p);
    
    if (compact.i) component.id = compact.i;
    if (compact.c) {
      (component as any).children = compact.c.map(c => this.expandComponent(c));
    }
    
    return component;
  }
  
  private static compress(data: string): string {
    // Simple LZ-string implementation for compression
    const dict: Record<string, number> = {};
    const result: (string | number)[] = [];
    let dictIndex = 256;
    let current = '';
    
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const combined = current + char;
      
      if (dict[combined] !== undefined) {
        current = combined;
      } else {
        result.push(current.length > 1 ? dict[current] : current);
        dict[combined] = dictIndex++;
        current = char;
      }
    }
    
    if (current !== '') {
      result.push(current.length > 1 ? dict[current] : current);
    }
    
    return JSON.stringify(result);
  }
  
  private static decompress(compressed: string): string {
    const data = JSON.parse(compressed);
    const dict: Record<number, string> = {};
    let dictIndex = 256;
    let result = '';
    let previous = '';
    
    for (const item of data) {
      let current = '';
      if (typeof item === 'string') {
        current = item;
      } else if (dict[item]) {
        current = dict[item];
      } else {
        current = previous + previous[0];
      }
      
      result += current;
      
      if (previous !== '') {
        dict[dictIndex++] = previous + current[0];
      }
      
      previous = current;
    }
    
    return result;
  }
  
  private static calculateChecksum(data: any): string {
    // Simple CRC32 implementation
    const str = JSON.stringify(data);
    let crc = 0 ^ (-1);
    
    for (let i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ this.CRC_TABLE[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    
    return ((crc ^ (-1)) >>> 0).toString(16);
  }
  
  private static readonly CRC_TABLE = (() => {
    const table = new Array(256);
    for (let i = 0; i < 256; i++) {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
      table[i] = crc;
    }
    return table;
  })();
}
```

### 1.3 Core Component Implementation

```typescript
// src/components/panel.ts
export interface PanelComponent extends BaseComponent {
  type: 'panel';
  layout?: 'vertical' | 'horizontal' | 'grid' | 'absolute';
  padding?: number | [number, number, number, number];
  spacing?: number;
  children: Component[];
  scrollable?: boolean;
  clipping?: boolean;
}

export class PanelSchema implements ComponentSchema<PanelComponent> {
  compactify(component: PanelComponent): PropertyArray {
    return [
      component.layout || 'vertical',
      component.padding || 0,
      component.spacing || 0,
      component.scrollable || false,
      component.clipping || true,
      this.compactifyStyle(component.style),
      component.visible !== false,
      component.enabled !== false
    ];
  }
  
  expand(properties: PropertyArray): PanelComponent {
    return {
      type: 'panel',
      layout: properties[0] as any,
      padding: properties[1] as any,
      spacing: properties[2] as number,
      scrollable: properties[3] as boolean,
      clipping: properties[4] as boolean,
      style: this.expandStyle(properties[5]),
      visible: properties[6] as boolean,
      enabled: properties[7] as boolean,
      children: [] // Children handled separately
    };
  }
  
  private compactifyStyle(style?: ComponentStyle): any[] {
    if (!style) return [];
    return [
      style.size || ['100%', '100%c'],
      style.offset || [0, 0],
      style.anchor || 'top_left',
      style.layer || 1,
      style.color,
      style.background,
      style.opacity || 1
    ];
  }
  
  private expandStyle(styleArray: any[]): ComponentStyle | undefined {
    if (!styleArray || styleArray.length === 0) return undefined;
    return {
      size: styleArray[0],
      offset: styleArray[1],
      anchor: styleArray[2],
      layer: styleArray[3],
      color: styleArray[4],
      background: styleArray[5],
      opacity: styleArray[6]
    };
  }
}

// src/components/button.ts
export interface ButtonComponent extends BaseComponent {
  type: 'button';
  text: string;
  icon?: string;
  iconSize?: [number, number];
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: (event: ButtonClickEvent) => void;
  disabled?: boolean;
}

export class ButtonSchema implements ComponentSchema<ButtonComponent> {
  compactify(component: ButtonComponent): PropertyArray {
    return [
      component.text,
      component.icon || '',
      component.iconSize || [16, 16],
      component.variant || 'primary',
      component.disabled || false,
      this.compactifyStyle(component.style),
      component.visible !== false,
      component.enabled !== false
    ];
  }
  
  expand(properties: PropertyArray): ButtonComponent {
    return {
      type: 'button',
      text: properties[0] as string,
      icon: properties[1] as string || undefined,
      iconSize: properties[2] as [number, number],
      variant: properties[3] as any,
      disabled: properties[4] as boolean,
      style: this.expandStyle(properties[5]),
      visible: properties[6] as boolean,
      enabled: properties[7] as boolean
    };
  }
}

// Register components
ComponentRegistry.register('panel', {
  type: 'panel',
  schema: new PanelSchema(),
  renderer: new PanelRenderer()
});

ComponentRegistry.register('button', {
  type: 'button', 
  schema: new ButtonSchema(),
  renderer: new ButtonRenderer()
});
```

## Phase 2: JSON UI Template Engine (Weeks 3-4)

### 2.1 Resource Pack Structure

```json
// resource_pack/manifest.json
{
  "format_version": 2,
  "header": {
    "description": "@bedrock-core/ui - Advanced UI System",
    "name": "Bedrock Core UI",
    "uuid": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "version": [1, 0, 0],
    "min_engine_version": [1, 20, 0]
  },
  "modules": [
    {
      "description": "UI Resources",
      "type": "resources",
      "uuid": "b2c3d4e5-f6a7-8901-2345-678901bcdef0", 
      "version": [1, 0, 0]
    }
  ]
}
```

```json
// resource_pack/ui/bedrock_ui.json
{
  "namespace": "bedrock_ui",
  
  "ui_engine_v1": {
    "type": "panel",
    "size": [0, 0],
    "bindings": [
      {
        "binding_name": "#title_text"
      },
      {
        "binding_name": "#ui_data_parsed",
        "binding_name_override": "#global_ui_data"  
      }
    ],
    "controls": [
      {
        "data_parser@bedrock_ui.data_parser": {}
      },
      {
        "component_factory": {
          "type": "factory",
          "factory": {
            "name": "ui_component_factory",
            "control_ids": {
              "panel": "@bedrock_ui.panel_renderer",
              "button": "@bedrock_ui.button_renderer",
              "text": "@bedrock_ui.text_renderer",
              "toggle": "@bedrock_ui.toggle_renderer", 
              "slider": "@bedrock_ui.slider_renderer",
              "input": "@bedrock_ui.input_renderer",
              "dropdown": "@bedrock_ui.dropdown_renderer"
            }
          }
        }
      }
    ]
  },

  "data_parser": {
    "type": "panel",
    "size": [0, 0],
    "bindings": [
      {
        "binding_name": "#title_text"
      }
    ],
    "controls": [
      {
        "parser_script": {
          "type": "custom",
          "$parse_logic": [
            "// Extract bedrock_ui: prefix",
            "// Parse JSON payload", 
            "// Decompress if needed",
            "// Validate checksum",
            "// Set global UI data"
          ]
        }
      }
    ]
  }
}
```

### 2.2 Component Renderers

```json
// resource_pack/ui/components/panel.json
{
  "namespace": "bedrock_ui",
  
  "panel_renderer": {
    "type": "panel",
    "$ui_identifier": "bedrock_ui:panel:",
    "bindings": [
      {
        "binding_name": "#title_text"
      },
      {
        "binding_type": "view",
        "source_control_name": "ui_engine_v1",
        "source_property_name": "(not ((#title_text - $ui_identifier) = #title_text))",
        "target_property_name": "#visible"
      },
      {
        "binding_name": "#panel_layout",
        "binding_type": "global"
      },
      {
        "binding_name": "#panel_size",
        "binding_type": "global"
      }
    ],
    "controls": [
      {
        "vertical_layout@bedrock_ui.vertical_stack": {
          "bindings": [
            {
              "binding_type": "view",
              "source_property_name": "(#panel_layout = 'vertical')",
              "target_property_name": "#visible"
            }
          ]
        }
      },
      {
        "horizontal_layout@bedrock_ui.horizontal_stack": {
          "bindings": [
            {
              "binding_type": "view", 
              "source_property_name": "(#panel_layout = 'horizontal')",
              "target_property_name": "#visible"
            }
          ]
        }
      },
      {
        "grid_layout@bedrock_ui.grid_layout": {
          "bindings": [
            {
              "binding_type": "view",
              "source_property_name": "(#panel_layout = 'grid')",
              "target_property_name": "#visible"
            }
          ]
        }
      }
    ]
  },

  "button_renderer": {
    "type": "panel", 
    "$ui_identifier": "bedrock_ui:button:",
    "bindings": [
      {
        "binding_name": "#title_text"
      },
      {
        "binding_type": "view",
        "source_control_name": "ui_engine_v1", 
        "source_property_name": "(not ((#title_text - $ui_identifier) = #title_text))",
        "target_property_name": "#visible"
      },
      {
        "binding_name": "#button_text",
        "binding_type": "global"
      },
      {
        "binding_name": "#button_icon",
        "binding_type": "global"  
      },
      {
        "binding_name": "#button_variant",
        "binding_type": "global"
      }
    ],
    "controls": [
      {
        "primary_button@bedrock_ui.primary_button": {
          "bindings": [
            {
              "binding_type": "view",
              "source_property_name": "(#button_variant = 'primary')",
              "target_property_name": "#visible"
            }
          ]
        }
      },
      {
        "secondary_button@bedrock_ui.secondary_button": {
          "bindings": [
            {
              "binding_type": "view",
              "source_property_name": "(#button_variant = 'secondary')",
              "target_property_name": "#visible"
            }
          ]
        }
      }
    ]
  }
}
```

## Phase 3: Developer API Implementation (Weeks 5-6)

### 3.1 Main API Classes

```typescript
// src/ui-form-data.ts
export class UIFormData {
  private components: Component[] = [];
  private formTitle: string = '';
  private submitText: string = 'Submit';
  
  constructor() {}
  
  title(text: string): this {
    this.formTitle = text;
    return this;
  }
  
  component(component: Component): this {
    this.components.push(component);
    return this;
  }
  
  panel(options: Partial<PanelComponent>, children: Component[] = []): this {
    return this.component({
      type: 'panel',
      children,
      ...options
    } as PanelComponent);
  }
  
  text(content: string, options: Partial<TextComponent> = {}): this {
    return this.component({
      type: 'text',
      content,
      ...options
    } as TextComponent);
  }
  
  button(text: string, options: Partial<ButtonComponent> = {}): this {
    return this.component({
      type: 'button', 
      text,
      ...options
    } as ButtonComponent);
  }
  
  toggle(label: string, options: Partial<ToggleComponent> = {}): this {
    return this.component({
      type: 'toggle',
      label,
      value: false,
      ...options
    } as ToggleComponent);
  }
  
  slider(label: string, min: number, max: number, options: Partial<SliderComponent> = {}): this {
    return this.component({
      type: 'slider',
      label,
      min,
      max,
      value: min,
      ...options
    } as SliderComponent);
  }
  
  input(placeholder: string, options: Partial<InputComponent> = {}): this {
    return this.component({
      type: 'input',
      placeholder,
      value: '',
      ...options
    } as InputComponent);
  }
  
  dropdown(label: string, options: DropdownOption[], config: Partial<DropdownComponent> = {}): this {
    return this.component({
      type: 'dropdown',
      label,
      options,
      ...config
    } as DropdownComponent);
  }
  
  build(): UIForm {
    return new UIForm(this.components, this.formTitle, this.submitText);
  }
  
  async show(player: Player): Promise<UIFormResponse> {
    const form = this.build();
    return await form.show(player);
  }
}

// src/ui-form.ts
export class UIForm {
  constructor(
    private components: Component[],
    private title: string = '',
    private submitText: string = 'Submit'
  ) {}
  
  async show(player: Player): Promise<UIFormResponse> {
    try {
      // Serialize components into title field
      const serializedData = UISerializer.serialize(this.components);
      
      // Create modal form with serialized data as title
      const modalForm = new ModalFormData()
        .title(serializedData)
        .submitButton(this.submitText);
      
      // Show form and handle response
      const response = await modalForm.show(player);
      
      if (response.canceled) {
        return {
          canceled: true,
          cancelationReason: response.cancelationReason,
          formValues: null
        };
      }
      
      // Parse response values based on component structure
      const formValues = this.parseFormValues(response.formValues);
      
      return {
        canceled: false,
        formValues,
        components: this.components
      };
    } catch (error) {
      throw new UIError(`Failed to show form: ${error.message}`, 'FORM_SHOW_ERROR');
    }
  }
  
  private parseFormValues(rawValues: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    let valueIndex = 0;
    
    const parseComponent = (component: Component, path: string = '') => {
      const key = component.id || `${component.type}_${valueIndex}`;
      const fullPath = path ? `${path}.${key}` : key;
      
      switch (component.type) {
        case 'toggle':
        case 'slider':
        case 'input':
        case 'dropdown':
          if (valueIndex < rawValues.length) {
            result[fullPath] = rawValues[valueIndex++];
          }
          break;
        case 'panel':
          if ('children' in component) {
            component.children.forEach(child => parseComponent(child, fullPath));
          }
          break;
      }
    };
    
    this.components.forEach(component => parseComponent(component));
    return result;
  }
}
```

### 3.2 React-like JSX Support

```typescript
// src/jsx.ts
export namespace JSX {
  export interface IntrinsicElements {
    panel: Partial<PanelComponent>;
    button: Partial<ButtonComponent>;
    text: Partial<TextComponent>;
    toggle: Partial<ToggleComponent>; 
    slider: Partial<SliderComponent>;
    input: Partial<InputComponent>;
    dropdown: Partial<DropdownComponent>;
  }
  
  export type Element = Component;
}

export function createElement(
  type: string | ComponentType,
  props: any,
  ...children: Component[]
): Component {
  if (typeof type === 'string') {
    const component: any = {
      type,
      ...props
    };
    
    if (children.length > 0) {
      component.children = children;
    }
    
    return component;
  }
  
  return type(props, children);
}

// Fragment support
export function Fragment(props: { children: Component[] }): Component[] {
  return props.children;
}

// Example usage with JSX
const MyCustomForm = () => (
  <panel layout="vertical" padding={10}>
    <text fontSize={18} color="#ffffff">
      Welcome to Advanced UI System
    </text>
    <button 
      variant="primary"
      icon="textures/items/diamond"
      onClick={(e) => console.log('Clicked!')}
    >
      Execute Action
    </button>
    <toggle label="Enable Notifications" defaultValue={true} />
  </panel>
);
```

## Phase 4: Examples & Documentation (Weeks 7-8)

### 4.1 Comprehensive Examples

```typescript
// examples/basic-form.ts
import { UIFormData } from '@bedrock-core/ui';

export function createBasicForm() {
  return new UIFormData()
    .title('Player Settings')
    .panel({ layout: 'vertical', padding: 15, spacing: 10 })
      .text('Configure your player settings:', { 
        fontSize: 16, 
        color: '#ffffff' 
      })
      .input('Player Name', {
        placeholder: 'Enter your display name...',
        maxLength: 20,
        validation: [
          { type: 'required', message: 'Name is required' },
          { type: 'minLength', value: 3, message: 'Name too short' }
        ]
      })
      .dropdown('Preferred Gamemode', [
        { label: 'Survival', value: 'survival' },
        { label: 'Creative', value: 'creative' },
        { label: 'Adventure', value: 'adventure' }
      ], { searchable: true })
      .toggle('Enable PvP', { defaultValue: false })
      .slider('Render Distance', 4, 32, { 
        defaultValue: 12,
        step: 2,
        showValue: true,
        formatter: (v) => `${v} chunks`
      })
    .build();
}

// examples/advanced-layout.ts
export const AdvancedLayoutExample = () => (
  <panel layout="horizontal" spacing={20} padding={[10, 15]}>
    <panel layout="vertical" style={{ size: ['50%', '100%'] }}>
      <text fontSize={18}>Left Panel</text>
      <button variant="primary">Primary Action</button>
      <button variant="secondary">Secondary Action</button>
    </panel>
    
    <panel layout="vertical" style={{ size: ['50%', '100%'] }}>
      <text fontSize={18}>Right Panel</text>
      <toggle label="Option 1" />
      <toggle label="Option 2" />
      <slider label="Volume" min={0} max={100} />
    </panel>
  </panel>
);

// examples/interactive-form.ts
export class InteractiveFormExample {
  private notificationsEnabled = false;
  private selectedTheme = 'dark';
  
  render() {
    return (
      <panel layout="vertical" padding={20} spacing={12}>
        <text fontSize={20} color="#4CAF50">
          Interactive Settings
        </text>
        
        <toggle 
          label="Enable Notifications"
          value={this.notificationsEnabled}
          onChange={(value) => {
            this.notificationsEnabled = value;
            this.onSettingsChange();
          }}
        />
        
        <dropdown
          label="Theme"
          options={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' }, 
            { label: 'Auto', value: 'auto' }
          ]}
          selectedValue={this.selectedTheme}
          onChange={(value) => {
            this.selectedTheme = value;
            this.onSettingsChange();
          }}
        />
        
        <button 
          variant="primary"
          onClick={() => this.saveSettings()}
        >
          Save Settings
        </button>
      </panel>
    );
  }
  
  private onSettingsChange() {
    // React to settings changes
    console.log('Settings updated:', {
      notifications: this.notificationsEnabled,
      theme: this.selectedTheme
    });
  }
  
  private saveSettings() {
    // Persist settings
    console.log('Settings saved!');
  }
}

// examples/usage-demo.ts
import { world } from '@minecraft/server';
import { createBasicForm } from './basic-form';

// Usage example
world.beforeEvents.chatSend.subscribe(async (event) => {
  if (event.message === '!settings') {
    event.cancel = true;
    
    try {
      const form = createBasicForm();
      const response = await form.show(event.sender);
      
      if (!response.canceled) {
        event.sender.sendMessage(`Settings saved: ${JSON.stringify(response.formValues, null, 2)}`);
      }
    } catch (error) {
      event.sender.sendMessage(`§cError: ${error.message}`);
    }
  }
});
```

### 4.2 Migration Guide

```typescript
// migration/from-native-ui.ts

// BEFORE: Using native @minecraft/server-ui
import { ModalFormData } from '@minecraft/server-ui';

const oldForm = new ModalFormData()
  .title('Player Settings')
  .toggle('Enable PvP', false)
  .slider('Render Distance', 4, 32, 1, 12)
  .textField('Player Name', 'Enter name...', '')
  .dropdown('Gamemode', ['Survival', 'Creative', 'Adventure'], 0);

// AFTER: Using @bedrock-core/ui
import { UIFormData } from '@bedrock-core/ui';

const newForm = new UIFormData()
  .title('Player Settings')
  .toggle('Enable PvP', { defaultValue: false })
  .slider('Render Distance', 4, 32, { 
    defaultValue: 12,
    showValue: true,
    formatter: (v) => `${v} chunks`
  })
  .input('Player Name', { 
    placeholder: 'Enter name...',
    validation: [{ type: 'required', message: 'Name required' }]
  })
  .dropdown('Gamemode', [
    { label: 'Survival', value: 'survival' },
    { label: 'Creative', value: 'creative' },
    { label: 'Adventure', value: 'adventure' }
  ]);

// Enhanced error handling and type safety
try {
  const response = await newForm.show(player);
  if (!response.canceled) {
    // Fully typed response values
    const playerName: string = response.formValues.playerName;
    const gamemode: string = response.formValues.gamemode;
  }
} catch (error) {
  if (error instanceof UIError) {
    console.error(`UI Error: ${error.code} - ${error.message}`);
  }
}
```

## Testing & Quality Assurance

### Test Implementation Strategy

```typescript
// tests/serializer.test.ts
import { UISerializer } from '../src/core/serializer';
import { ComponentRegistry } from '../src/core/component-registry';

describe('UISerializer', () => {
  beforeEach(() => {
    // Register test components
    ComponentRegistry.register('test_panel', testPanelDefinition);
    ComponentRegistry.register('test_button', testButtonDefinition);
  });
  
  test('should serialize and deserialize simple component', () => {
    const component: PanelComponent = {
      type: 'panel',
      layout: 'vertical',
      children: []
    };
    
    const serialized = UISerializer.serialize([component]);
    expect(serialized).toMatch(/^bedrock_ui:/);
    
    const deserialized = UISerializer.deserialize(serialized);
    expect(deserialized).toHaveLength(1);
    expect(deserialized[0].type).toBe('panel');
  });
  
  test('should handle compression for large UIs', () => {
    const largeComponent = createLargeTestComponent();
    const serialized = UISerializer.serialize([largeComponent]);
    
    expect(serialized.length).toBeLessThan(1024);
    
    const deserialized = UISerializer.deserialize(serialized);
    expect(deserialized).toEqual([largeComponent]);
  });
  
  test('should throw error if data exceeds size limit', () => {
    const oversizedComponent = createOversizedTestComponent();
    
    expect(() => {
      UISerializer.serialize([oversizedComponent]);
    }).toThrow(SerializationError);
  });
});

// tests/integration.test.ts
describe('UI Integration Tests', () => {
  test('should create and show form successfully', async () => {
    const form = new UIFormData()
      .text('Hello World')
      .button('Click Me')
      .build();
    
    // Mock player for testing
    const mockPlayer = createMockPlayer();
    
    // This would require a test environment with Minecraft server
    // const response = await form.show(mockPlayer);
    // expect(response).toBeDefined();
  });
});
```

## Performance Benchmarks

```typescript
// benchmarks/serialization-benchmark.ts
export function runSerializationBenchmarks() {
  const components = [
    createSimpleComponent(),
    createMediumComponent(), 
    createComplexComponent(),
    createLargeComponent()
  ];
  
  console.log('Serialization Performance Benchmarks:');
  
  components.forEach((component, index) => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      const serialized = UISerializer.serialize([component]);
      UISerializer.deserialize(serialized);
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 1000;
    
    console.log(`Component ${index + 1}: ${avgTime.toFixed(3)}ms average`);
  });
}
```

This implementation guide provides a complete roadmap for developing the `@bedrock-core/ui` system. The modular architecture ensures maintainability while the performance optimizations guarantee minimal impact on game performance. The comprehensive examples and migration guide will help developers adopt this revolutionary UI system for Minecraft Bedrock.
