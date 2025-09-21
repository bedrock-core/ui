# @bedrock-core/ui - Technical Architecture Specification

## Executive Summary

This document outlines the comprehensive technical architecture for `@bedrock-core/ui`, a revolutionary custom UI system for Minecraft Bedrock that exploits text field data transmission to bypass native `@minecraft/server-ui` limitations. The system uses a two-part architecture: a TypeScript component API and a JSON UI configuration system connected through serialized data transmission.

## Core Innovation: Text Field Data Transmission

### Discovery

The critical breakthrough is that text fields in JSON UI forms can be read and used with conditional rendering found in the [`server_form.json`](../../../Resources/vanilla/resource_pack/ui/server_form.json) documentation. This includes [`#title_text`](../../../Resources/vanilla/resource_pack/ui/server_form.json:259), [`#form_button_text`](../../../Resources/vanilla/resource_pack/ui/server_form.json:217), [`#custom_text`](../../../Resources/vanilla/resource_pack/ui/server_form.json:341), and other text properties.

### Mechanism

Instead of displaying the actual text, we:

1. Serialize UI component data into available text fields
2. Parse this data within JSON UI using binding expressions
3. Trigger conditional rendering based on data content with element-scoped access
4. Render sophisticated UI components impossible with native APIs

### Text Embedding Scope

Each embedded value is scoped within its own element context:

- [`modalformdata.title`](node_modules/@minecraft/server-ui/index.d.ts:594) → [`#title_text`](../../../Resources/vanilla/resource_pack/ui/server_form.json:259) (global form scope)
- [`form_button_text`](../../../Resources/vanilla/resource_pack/ui/server_form.json:217) (per-button scope)
- [`custom_text`](../../../Resources/vanilla/resource_pack/ui/server_form.json:341) (per-element scope)
- Other applicable text properties in JSON UI elements

## Part 1: TypeScript Component API Layer

### 1.1 JSON UI Property Group Interfaces

Based on the [JSON UI documentation](src/temp/json-ui-documentation.md), we create shared property group interfaces that map from documented JSON UI properties:

```typescript
// Control property group - shared by all elements
interface ControlProperties {
  visible?: boolean;
  enabled?: boolean;
  layer?: number;
  alpha?: number;
  propagate_alpha?: boolean;
  clips_children?: boolean;
  allow_clipping?: boolean;
  clip_offset?: [number, number];
  use_child_anchors?: boolean;
  ignored?: boolean;
}

// Layout property group - positioning and sizing
interface LayoutProperties {
  size?: [number | string, number | string];
  max_size?: [number | string, number | string];
  min_size?: [number | string, number | string];
  offset?: [number, number];
  anchor_from?: AnchorPosition;
  anchor_to?: AnchorPosition;
  inherit_max_sibling_width?: boolean;
  inherit_max_sibling_height?: boolean;
  contained?: boolean;
  draggable?: 'vertical' | 'horizontal' | 'both';
  follows_cursor?: boolean;
}

// Data Binding property group - for hardcoded values
interface DataBindingProperties {
  bindings?: DataBinding[];
}

// Input property group - for interactive elements
interface InputProperties {
  button_mappings?: ButtonMapping[];
  modal?: boolean;
  always_listen_to_input?: boolean;
  hover_enabled?: boolean;
  consume_event?: boolean;
}

// Focus property group - for navigation
interface FocusProperties {
  focus_enabled?: boolean;
  focus_identifier?: string;
  default_focus_precedence?: number;
  focus_change_down?: string;
  focus_change_up?: string;
  focus_change_left?: string;
  focus_change_right?: string;
}

// Sound property group - for audio feedback
interface SoundProperties {
  sound_name?: string;
  sound_volume?: number;
  sound_pitch?: number;
  sounds?: SoundDefinition[];
}
```

### 1.2 Base Component Interface

```typescript
// Base component combining common property groups
interface BaseComponent extends ControlProperties, LayoutProperties, DataBindingProperties {
  id?: string;
  type: string;
}

// Interactive base for input elements
interface InteractiveComponent extends BaseComponent, InputProperties, FocusProperties, SoundProperties {
  // Additional interactive properties
}

type AnchorPosition =
  | 'top_left' | 'top_middle' | 'top_right'
  | 'left_middle' | 'center' | 'right_middle'
  | 'bottom_left' | 'bottom_middle' | 'bottom_right';

interface DataBinding {
  binding_name?: string;
  binding_name_override?: string;
  binding_type?: 'global' | 'view' | 'collection' | 'collection_details' | 'none';
  binding_collection_name?: string;
  binding_condition?: 'always' | 'always_when_visible' | 'visible' | 'once' | 'none';
  source_control_name?: string;
  source_property_name?: string;
  target_property_name?: string;
}

interface ButtonMapping {
  from_button_id: string;
  to_button_id: string;
  mapping_type?: 'global' | 'pressed' | 'double_pressed' | 'focused';
  scope?: 'view' | 'controller';
}

interface SoundDefinition {
  sound_name: string;
  sound_volume?: number;
  sound_pitch?: number;
  min_seconds_between_plays?: number;
}
```

### 1.3 Mapped Component Interfaces

Mapping from documented JSON UI elements to internal interfaces with property renaming support:

```typescript
// Panel - Maps to JSON UI 'panel' element
interface PanelComponent extends BaseComponent {
  type: 'panel';
  // Renamed properties for developer experience
  layout?: 'vertical' | 'horizontal' | 'grid' | 'absolute'; // Maps to orientation + custom logic
  padding?: number | [number, number, number, number];     // Custom property
  spacing?: number;                                         // Custom property
  children: Component[];                                    // Maps to controls array
  scrollable?: boolean;                                     // Custom property
  // JSON UI properties (maintain same functionality)
  controls?: any[];                                         // Native JSON UI controls
}

// Button - Maps to JSON UI 'button' element
interface ButtonComponent extends InteractiveComponent {
  type: 'button';
  // Renamed properties
  text: string;                                            // Maps to button text binding
  icon?: string;                                           // Custom property for texture
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; // Custom styling
  // JSON UI button properties
  default_control?: string;
  hover_control?: string;
  pressed_control?: string;
  locked_control?: string;
  // Note: onClick excluded (function property)
}

// Text - Maps to JSON UI 'label' element
interface TextComponent extends BaseComponent {
  type: 'text';
  // Renamed properties
  content: string;                                         // Maps to text property
  fontSize?: 'small' | 'normal' | 'large' | 'extra_large'; // Maps to font_size
  textAlign?: 'left' | 'center' | 'right' | 'justify';    // Maps to text_alignment
  wrap?: boolean;                                          // Custom property
  // JSON UI text properties
  text?: string;
  color?: [number, number, number];
  locked_color?: [number, number, number];
  shadow?: boolean;
  font_size?: 'small' | 'normal' | 'large' | 'extra_large';
  font_scale_factor?: number;
  font_type?: string;
  localize?: boolean;
}

// Toggle - Maps to JSON UI 'toggle' element
interface ToggleComponent extends InteractiveComponent {
  type: 'toggle';
  // Renamed properties
  label: string;                                           // Maps to toggle label
  value: boolean;                                         // Maps to toggle state
  variant?: 'switch' | 'checkbox' | 'radio';             // Custom styling
  // JSON UI toggle properties
  toggle_name?: string;
  toggle_default_state?: boolean;
  toggle_group_forced_index?: number;
  checked_control?: string;
  unchecked_control?: string;
  checked_hover_control?: string;
  unchecked_hover_control?: string;
  // Note: onChange excluded (function property)
}

// Slider - Maps to JSON UI 'slider' element
interface SliderComponent extends InteractiveComponent {
  type: 'slider';
  // Renamed properties
  label: string;                                           // Custom property for label
  min: number;                                            // Custom property (maps to steps)
  max: number;                                            // Custom property (maps to steps)
  value: number;                                          // Maps to slider value
  showValue?: boolean;                                    // Custom property
  // JSON UI slider properties
  slider_name?: string;
  slider_steps?: number;
  slider_direction?: 'vertical' | 'horizontal';
  slider_box_control?: string;
  background_control?: string;
  progress_control?: string;
  // Note: onChange and formatter excluded (function properties)
}

// Input - Maps to JSON UI 'edit_box' element
interface InputComponent extends InteractiveComponent {
  type: 'input';
  // Renamed properties
  placeholder?: string;                                    // Maps to place holder text
  value: string;                                          // Maps to text content
  multiline?: boolean;                                    // Maps to enabled_newline
  // JSON UI edit_box properties
  text_box_name?: string;
  max_length?: number;
  text_type?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
  enabled_newline?: boolean;
  text_control?: string;
  place_holder_control?: string;
  // Note: onChange and validation excluded (function properties)
}

// Image - Maps to JSON UI 'image' element
interface ImageComponent extends BaseComponent {
  type: 'image';
  // Renamed properties
  source: string;                                         // Maps to texture
  // JSON UI image properties
  texture?: string;
  uv?: [number, number];
  uv_size?: [number, number];
  texture_file_system?: string;
  nineslice_size?: number | [number, number, number, number];
  tiled?: boolean | 'x' | 'y';
  keep_ratio?: boolean;
  bilinear?: boolean;
}
```

### 1.4 Declarative API Design

```typescript
// React-like JSX syntax (via TypeScript JSX)
const MyForm = () => (
  <Panel layout="vertical" padding={[10, 15]} spacing={8}>
    <Text fontSize={18} color="#ffffff">
      Advanced UI System Demo
    </Text>
    
    <Button 
      variant="primary" 
      icon="textures/items/diamond"
      onClick={(e) => handleButtonClick(e)}
    >
      Execute Action
    </Button>
    
    <Toggle 
      label="Enable notifications"
      defaultValue={true}
      onChange={(value) => setNotifications(value)}
    />
    
    <Slider 
      label="Volume Level"
      min={0}
      max={100}
      step={5}
      defaultValue={50}
      showValue={true}
      formatter={(v) => `${v}%`}
    />
    
    <Input 
      label="Player Name"
      placeholder="Enter your name..."
      maxLength={20}
      validation={[
        { type: 'required', message: 'Name is required' },
        { type: 'minLength', value: 3, message: 'Name too short' }
      ]}
    />
    
    <Dropdown 
      label="Select Gamemode"
      searchable={true}
      options={[
        { label: 'Survival', value: 'survival' },
        { label: 'Creative', value: 'creative' },
        { label: 'Adventure', value: 'adventure' }
      ]}
    />
  </Panel>
);

// Builder pattern for compatibility
const form = new UIFormData()
  .title('My Custom Form')
  .panel({ layout: 'vertical', padding: [10, 15] })
    .text('Advanced UI System Demo', { fontSize: 18 })
    .button('Execute Action', { 
      variant: 'primary',
      icon: 'textures/items/diamond',
      onClick: handleButtonClick 
    })
    .toggle('Enable notifications', { defaultValue: true })
    .slider('Volume Level', { min: 0, max: 100, step: 5 })
    .input('Player Name', { placeholder: 'Enter your name...' })
    .dropdown('Select Gamemode', { 
      options: gamemodeOptions,
      searchable: true 
    })
  .build();
```

## Part 2: Compact Serialization Protocol

### 2.1 Data Structure Design

```typescript
// Ultra-compact serialization format
interface UISerializedData {
  v: string;        // Version (e.g., "1.0")
  t: 'ui';          // Type identifier
  c: string;        // Checksum (CRC32)
  z: boolean;       // Compressed flag
  d: CompactComponent[]; // Component data
}

// Compact component representation
interface CompactComponent {
  t: ComponentType;     // Component type (enum 0-255)
  i?: string;          // ID (optional)
  p: PropertyArray;    // Properties as array
  c?: CompactComponent[]; // Children (optional)
  e?: EventArray;      // Events (optional)
}

// Property encoding strategies
type PropertyArray = (string | number | boolean | null)[];

// Component type enumeration for compactness
enum ComponentType {
  PANEL = 0,
  BUTTON = 1,
  TEXT = 2,
  TOGGLE = 3,
  SLIDER = 4,
  INPUT = 5,
  DROPDOWN = 6,
  // Reserved for future components 7-255
}
```

### 2.2 Serialization Implementation

```typescript
class UISerializer {
  private static readonly VERSION = '1.0';
  private static readonly MAX_TITLE_LENGTH = 1024; // Conservative limit
  
  static serialize(components: Component[]): string {
    const compact = components.map(c => this.compactifyComponent(c));
    
    const data: UISerializedData = {
      v: this.VERSION,
      t: 'ui',
      c: this.calculateChecksum(compact),
      z: false,
      d: compact
    };
    
    let serialized = JSON.stringify(data);
    
    // Apply compression if needed
    if (serialized.length > this.MAX_TITLE_LENGTH * 0.8) {
      const compressed = this.compress(serialized);
      if (compressed.length < serialized.length) {
        data.z = true;
        serialized = compressed;
      }
    }
    
    if (serialized.length > this.MAX_TITLE_LENGTH) {
      throw new SerializationError('UI data exceeds title field capacity');
    }
    
    return `bedrock_ui:${serialized}`;
  }
  
  static deserialize(titleData: string): Component[] {
    if (!titleData.startsWith('bedrock_ui:')) {
      throw new DeserializationError('Invalid title data format');
    }
    
    const jsonData = titleData.slice(11);
    let data: UISerializedData;
    
    try {
      const parsed = JSON.parse(jsonData);
      data = parsed.z ? JSON.parse(this.decompress(parsed.d)) : parsed;
    } catch (e) {
      throw new DeserializationError('Failed to parse UI data');
    }
    
    // Verify checksum
    if (data.c !== this.calculateChecksum(data.d)) {
      throw new DeserializationError('UI data integrity check failed');
    }
    
    return data.d.map(c => this.expandComponent(c));
  }
  
  private static compactifyComponent(component: Component): CompactComponent {
    const compact: CompactComponent = {
      t: this.getComponentTypeId(component.type),
      p: this.compactifyProperties(component)
    };
    
    if (component.id) compact.i = component.id;
    if ('children' in component) {
      compact.c = component.children.map(c => this.compactifyComponent(c));
    }
    
    return compact;
  }
  
  private static compress(data: string): string {
    // Implement LZ-string or similar compression
    return data; // Placeholder
  }
  
  private static calculateChecksum(data: any): string {
    // Implement CRC32 or similar
    return 'checksum'; // Placeholder
  }
}
```

## Part 3: JSON UI Configuration System

### 3.1 Core Configuration Architecture

The JSON UI system is a smartly configured file structure that enables customizable UI building through conditional rendering and data bindings:

```json
{
  "namespace": "bedrock_ui",
  
  "ui_configuration_v1": {
    "type": "panel",
    "size": [0, 0],
    "bindings": [
      {
        "binding_name": "#title_text"
      },
      {
        "binding_name": "#form_button_text"
      },
      {
        "binding_name": "#custom_text"
      }
    ],
    "controls": [
      {
        "element_factory": {
          "type": "factory",
          "factory": {
            "name": "ui_element_factory",
            "control_ids": {
              "panel": "@bedrock_ui.panel_configuration",
              "button": "@bedrock_ui.button_configuration",
              "label": "@bedrock_ui.text_configuration",
              "image": "@bedrock_ui.image_configuration",
              "toggle": "@bedrock_ui.toggle_configuration",
              "slider": "@bedrock_ui.slider_configuration",
              "edit_box": "@bedrock_ui.input_configuration"
            }
          }
        }
      }
    ]
  }
}
```

### 3.2 Element Configurations

Each JSON UI element has its own configuration with element-scoped text embedding:

```json
{
  "panel_configuration": {
    "type": "panel",
    "$ui_identifier": "bedrock_ui:panel:",
    "bindings": [
      {
        "binding_name": "#title_text"
      },
      {
        "binding_type": "view",
        "source_control_name": "ui_configuration_v1",
        "source_property_name": "(not ((#title_text - $ui_identifier) = #title_text))",
        "target_property_name": "#visible"
      }
    ],
    "controls": [
      {
        "dynamic_panel@bedrock_ui.configurable_panel": {
          "bindings": [
            {
              "binding_name": "#panel_data",
              "binding_type": "global"
            }
          ]
        }
      }
    ]
  },

  "button_configuration": {
    "type": "button",
    "$ui_identifier": "bedrock_ui:button:",
    "bindings": [
      {
        "binding_name": "#form_button_text"
      },
      {
        "binding_type": "view",
        "source_property_name": "(not ((#form_button_text - $ui_identifier) = #form_button_text))",
        "target_property_name": "#visible"
      }
    ],
    "default_control": "default_button_state",
    "hover_control": "hover_button_state",
    "pressed_control": "pressed_button_state",
    "locked_control": "locked_button_state",
    "controls": [
      {
        "default_button_state@bedrock_ui.configurable_button_default": {}
      },
      {
        "hover_button_state@bedrock_ui.configurable_button_hover": {}
      },
      {
        "pressed_button_state@bedrock_ui.configurable_button_pressed": {}
      },
      {
        "locked_button_state@bedrock_ui.configurable_button_locked": {}
      }
    ]
  },

  "text_configuration": {
    "type": "label",
    "$ui_identifier": "bedrock_ui:text:",
    "bindings": [
      {
        "binding_name": "#custom_text"
      },
      {
        "binding_type": "view",
        "source_property_name": "(not ((#custom_text - $ui_identifier) = #custom_text))",
        "target_property_name": "#visible"
      }
    ],
    "text": "#parsed_text_content",
    "font_size": "#parsed_font_size",
    "color": "#parsed_text_color",
    "text_alignment": "#parsed_text_alignment"
  },

  "toggle_configuration": {
    "type": "toggle",
    "$ui_identifier": "bedrock_ui:toggle:",
    "bindings": [
      {
        "binding_name": "#custom_text"
      },
      {
        "binding_type": "view",
        "source_property_name": "(not ((#custom_text - $ui_identifier) = #custom_text))",
        "target_property_name": "#visible"
      }
    ],
    "toggle_name": "bedrock_ui_toggle",
    "toggle_default_state": "#parsed_toggle_state",
    "checked_control": "checked_state",
    "unchecked_control": "unchecked_state",
    "checked_hover_control": "checked_hover_state",
    "unchecked_hover_control": "unchecked_hover_state"
  }
}
```

### 3.3 Element-Scoped Data Binding System

The configuration system supports element-scoped text embedding with different text fields:

```json
{
  "title_scope_parser": {
    "type": "panel",
    "size": [0, 0],
    "bindings": [
      {
        "binding_name": "#title_text"
      },
      {
        "binding_name": "#parsed_title_data",
        "binding_name_override": "#global_title_data"
      }
    ],
    "$data_extraction_logic": [
      "// Extract data from title_text (global form scope)",
      "// Parse serialized UI structure",
      "// Apply to global bindings for title-scoped elements"
    ]
  },

  "button_scope_parser": {
    "type": "panel",
    "size": [0, 0],
    "bindings": [
      {
        "binding_name": "#form_button_text"
      },
      {
        "binding_name": "#parsed_button_data",
        "binding_name_override": "#element_button_data"
      }
    ],
    "$data_extraction_logic": [
      "// Extract data from form_button_text (per-button scope)",
      "// Parse button-specific configuration",
      "// Apply to button element bindings"
    ]
  },

  "element_scope_parser": {
    "type": "panel",
    "size": [0, 0],
    "bindings": [
      {
        "binding_name": "#custom_text"
      },
      {
        "binding_name": "#parsed_element_data",
        "binding_name_override": "#local_element_data"
      }
    ],
    "$data_extraction_logic": [
      "// Extract data from custom_text (per-element scope)",
      "// Parse element-specific properties",
      "// Apply to individual element bindings"
    ]
  }
}
```

## Part 4: Resource Pack Integration

### 4.1 File Structure

```
@bedrock-core/ui-resource-pack/
├── manifest.json
├── ui/
│   ├── bedrock_ui.json              # Main engine
│   ├── server_form.json             # Integration modifications
│   ├── components/
│   │   ├── panel.json
│   │   ├── button.json  
│   │   ├── text.json
│   │   ├── toggle.json
│   │   ├── slider.json
│   │   ├── input.json
│   │   └── dropdown.json
│   ├── layouts/
│   │   ├── vertical_stack.json
│   │   ├── horizontal_stack.json
│   │   ├── grid_layout.json
│   │   └── absolute_layout.json
│   ├── themes/
│   │   ├── default_theme.json
│   │   ├── dark_theme.json
│   │   └── high_contrast.json
│   └── utilities/
│       ├── scrolling.json
│       ├── animations.json
│       └── responsive.json
├── textures/ui/bedrock_ui/
│   ├── icons/
│   ├── backgrounds/
│   ├── borders/
│   └── patterns/
└── texts/
    └── en_US.lang
```

### 4.2 Server Form Modifications

```json
{
  "custom_form": {
    "modifications": [
      {
        "array_name": "bindings",
        "operation": "insert_back",
        "value": [
          {
            "binding_name": "#title_text"
          },
          {
            "binding_type": "view",
            "source_property_name": "((#title_text - 'bedrock_ui:') = #title_text)",
            "target_property_name": "#visible"
          }
        ]
      }
    ]
  },
  
  "main_screen_content": {
    "modifications": [
      {
        "array_name": "controls",
        "operation": "insert_back", 
        "value": [
          {
            "bedrock_ui_factory": {
              "type": "panel",
              "factory": {
                "name": "server_form_factory",
                "control_ids": {
                  "custom_form": "@bedrock_ui.ui_engine_v1"
                }
              }
            }
          }
        ]
      }
    ]
  }
}
```

## Part 5: Performance Optimization

### 5.1 Serialization Optimization

- **Property Mapping**: Use numeric indices for common properties
- **Delta Compression**: Only serialize changed properties
- **Template Caching**: Cache common component patterns
- **Lazy Evaluation**: Parse components on-demand

### 5.2 Rendering Optimization  

- **Conditional Rendering**: Only render visible components
- **Virtual Scrolling**: Handle large lists efficiently
- **Component Pooling**: Reuse component instances
- **Memory Management**: Automatic cleanup of unused resources

### 5.3 Memory Management

```typescript
class UIMemoryManager {
  private static componentPool = new Map<ComponentType, Component[]>();
  private static activeComponents = new WeakSet<Component>();
  
  static borrowComponent<T extends Component>(type: ComponentType): T {
    const pool = this.componentPool.get(type) || [];
    const component = pool.pop() || this.createComponent(type);
    this.activeComponents.add(component);
    return component as T;
  }
  
  static returnComponent(component: Component): void {
    if (this.activeComponents.has(component)) {
      this.resetComponent(component);
      const pool = this.componentPool.get(component.type) || [];
      pool.push(component);
      this.componentPool.set(component.type, pool);
      this.activeComponents.delete(component);
    }
  }
  
  static cleanup(): void {
    // Periodic cleanup of unused components
    for (const [type, pool] of this.componentPool) {
      if (pool.length > 10) { // Keep max 10 of each type
        pool.splice(10).forEach(c => this.destroyComponent(c));
      }
    }
  }
}
```

## Part 6: Error Handling & Validation

### 6.1 Error Types

```typescript
export class UIError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'UIError';
  }
}

export class SerializationError extends UIError {
  constructor(message: string) {
    super(message, 'SERIALIZATION_ERROR');
  }
}

export class DeserializationError extends UIError {
  constructor(message: string) {
    super(message, 'DESERIALIZATION_ERROR');
  }
}

export class RenderError extends UIError {
  constructor(message: string, public componentId?: string) {
    super(message, 'RENDER_ERROR');
  }
}

export class ValidationError extends UIError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR');
  }
}
```

### 6.2 Validation Framework

```typescript
interface ValidationRule {
  type: string;
  message: string;
  value?: any;
  validator?: (value: any) => boolean;
}

class ComponentValidator {
  static validateComponent(component: Component): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Type validation
    if (!this.isValidComponentType(component.type)) {
      errors.push(new ValidationError(
        `Invalid component type: ${component.type}`,
        'type'
      ));
    }
    
    // Property validation
    const typeValidator = this.getTypeValidator(component.type);
    const propertyErrors = typeValidator.validate(component);
    errors.push(...propertyErrors);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static validateUI(components: Component[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    
    for (const component of components) {
      const result = this.validateComponent(component);
      allErrors.push(...result.errors);
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}
```

## Part 7: Development Tools & Debugging

### 7.1 Component Inspector

```typescript
class UIInspector {
  static inspectComponent(component: Component): ComponentInfo {
    return {
      id: component.id,
      type: component.type,
      properties: this.extractProperties(component),
      children: 'children' in component ? component.children.length : 0,
      serializedSize: UISerializer.getSize(component),
      renderTime: this.measureRenderTime(component)
    };
  }
  
  static inspectUI(components: Component[]): UIInfo {
    return {
      totalComponents: this.countComponents(components),
      maxDepth: this.calculateMaxDepth(components),
      totalSize: UISerializer.getSize(components),
      memoryUsage: UIMemoryManager.getUsage(),
      performance: this.getPerformanceMetrics()
    };
  }
}
```

### 7.2 Hot Reload System (Development)

```typescript
class UIHotReload {
  private static watchers = new Map<string, FileWatcher>();
  
  static enable(): void {
    // Watch TypeScript component files
    this.watchDirectory('src/components', (file) => {
      this.recompileComponent(file);
      this.notifyClients('component-updated', file);
    });
    
    // Watch JSON UI files
    this.watchDirectory('resource_pack/ui', (file) => {
      this.reloadResourcePack(file);
      this.notifyClients('ui-updated', file);
    });
  }
  
  static disable(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}
```

## Conclusion

This architecture provides a comprehensive foundation for the `@bedrock-core/ui` system that will revolutionize Minecraft Bedrock UI development. The innovative use of element-scoped text field data transmission combined with JSON UI configuration system enables sophisticated user interfaces previously impossible with the native API.

Key advantages:

- **Configuration-Based**: Smart JSON UI file structure rather than complex rendering engine
- **Element-Scoped Embedding**: Multiple text fields with proper scoping for flexible data transmission
- **Property Group Mapping**: Direct mapping from documented JSON UI elements and property groups
- **Zero Dependencies**: Pure TypeScript/JavaScript compatible with QuickJS
- **Developer Experience**: React-like declarative API with full type safety and property renaming
- **Extensible**: Plugin architecture for custom components with JSON UI element mapping
- **Backwards Compatible**: Works alongside existing server-ui elements

The configuration-based design ensures maintainability and direct JSON UI compatibility while the element mapping system provides intuitive developer experience with full access to native JSON UI capabilities.
