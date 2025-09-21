import type { Component } from '../types/json_ui/components.js';
import type {
  CompactComponent,
  UISerializedData,
  ComponentType,
} from '../types/jsx/serialization.js';
import { SerializationError, DeserializationError } from '../types/jsx/serialization.js';

/**
 * UI Serialization class for converting components to compact format
 * This is a basic implementation - will be enhanced in future iterations
 */
export class UISerializer {
  private static readonly VERSION = '1.0';
  private static readonly MAX_TITLE_LENGTH = 1024; // Conservative limit

  /**
   * Serialize components to compact string format for title field embedding
   */
  static serialize(components: Component[]): string {
    try {
      // For now, create a simplified serialization
      // TODO: Implement full compact serialization protocol from ARCHITECTURE.md
      const serializedData = JSON.stringify({
        version: this.VERSION,
        components: components.map(c => this._simplifyComponent(c)),
      });

      if (serializedData.length > this.MAX_TITLE_LENGTH) {
        throw new SerializationError('UI data exceeds title field capacity');
      }

      return `bedrock_ui:${serializedData}`;
    } catch (error) {
      if (error instanceof SerializationError) {
        throw error;
      }
      throw new SerializationError(`Failed to serialize UI data: ${error}`);
    }
  }

  /**
   * Deserialize title data back to components
   */
  static deserialize(titleData: string): Component[] {
    try {
      if (!titleData.startsWith('bedrock_ui:')) {
        throw new DeserializationError('Invalid title data format');
      }

      const jsonData = titleData.slice(11);
      const data = JSON.parse(jsonData);

      if (data.version !== this.VERSION) {
        throw new DeserializationError(`Unsupported version: ${data.version}`);
      }

      return data.components as Component[];
    } catch (error) {
      if (error instanceof DeserializationError) {
        throw error;
      }
      throw new DeserializationError(`Failed to deserialize UI data: ${error}`);
    }
  }

  /**
   * Simplified component representation for basic serialization
   * TODO: Replace with full compact protocol implementation
   */
  private static _simplifyComponent(component: Component): any {
    // Remove function properties and create serializable representation
    const simplified: any = {
      ...component,
    };

    // Remove any function properties that shouldn't be serialized
    Object.keys(simplified).forEach(key => {
      if (typeof simplified[key] === 'function') {
        delete simplified[key];
      }
    });

    // Handle children recursively
    if ('children' in component && component.children) {
      (simplified as any).children = (component.children as Component[]).map((child: Component) =>
        this._simplifyComponent(child)
      );
    }

    return simplified;
  }

  /**
   * Get estimated serialized size for a component tree
   */
  static getSize(components: Component[]): number {
    try {
      return this.serialize(components).length;
    } catch {
      return 0;
    }
  }
}