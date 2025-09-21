import { ModalFormData } from '@minecraft/server-ui';
import type { Component } from '../types/json_ui/components.js';

// Type for component tuple [Component, formFunction]
type ComponentTuple = [Component, (form: FormData) => void];

/**
 * Processes component trees for presentation
 * Handles both JSON UI serialization and ModalForm generation
 */
export class ComponentProcessor {

  /**
   * Flattens a component tree into a list of components
   * Recursively traverses children and collects all components
   * Now works with component tuples from component functions
   */
  static flattenComponentTree(componentOrTuple: Component | ComponentTuple): Component[] {
    // Handle both direct components and tuples from component functions
    const component = Array.isArray(componentOrTuple) ? componentOrTuple[0] : componentOrTuple;
    const components: Component[] = [component];

    // Check if component has children (controls property)
    if ('controls' in component && component.controls) {
      for (const child of component.controls) {
        components.push(...this.flattenComponentTree(child));
      }
    }

    return components;
  }

  /**
   * Flattens component tuples and extracts both components and their ModalForm functions
   * This is used when we have tuples from component functions
   */
  static flattenComponentTuples(componentTuple: ComponentTuple): { components: Component[]; formFunctions: Array<(modalForm: ModalFormData) => void> } {
    const [component, formFunction] = componentTuple;
    const components: Component[] = [component];
    const formFunctions: Array<(modalForm: ModalFormData) => void> = [formFunction];

    // Check if component has children (controls property)
    if ('controls' in component && component.controls) {
      for (const child of component.controls) {
        const childResults = Array.isArray(child)
          ? this.flattenComponentTuples(child as ComponentTuple)
          : this.flattenComponentTuples([child, () => { }] as ComponentTuple);

        components.push(...childResults.components);
        formFunctions.push(...childResults.formFunctions);
      }
    }

    return { components, formFunctions };
  }

  /**
   * Adds components to a ModalFormData instance using their ModalForm functions
   * Maps component types to appropriate modalForm methods using internal functions
   */
  static addComponentsToModalForm(modalForm: ModalFormData, formFunctions: Array<(modalForm: ModalFormData) => void>): ModalFormData {
    for (const formFunction of formFunctions) {
      formFunction(modalForm);
    }
    return modalForm;
  }

  /**
   * Legacy method that works with raw components (kept for compatibility)
   * @deprecated Use addComponentsToModalForm with formFunctions instead
   */
  static addComponentsToModalFormLegacy(modalForm: ModalFormData, components: Component[]): ModalFormData {
    for (const component of components) {
      this.addComponentToModalForm(modalForm, component);
    }
    return modalForm;
  }

  /**
   * Gets all interactive components that will generate form fields
   * Used to validate that we have actionable components
   */
  static getInteractiveComponents(components: Component[]): Component[] {
    return components.filter(component => {
      return ['toggle', 'slider', 'edit_box', 'dropdown'].includes(component.type);
    });
  }

  /**
   * Validates that a component tree has at least some interactive elements
   * or can be presented as a display-only form
   */
  static validateComponentTree(component: Component): { isValid: boolean; errors: string[] } {
    const components = this.flattenComponentTree(component);
    const interactive = this.getInteractiveComponents(components);

    const errors: string[] = [];

    // Check if we have any components at all
    if (components.length === 0) {
      errors.push('Component tree is empty');
    }

    // For now, allow display-only forms (they'll just show the JSON UI rendering)
    // Interactive components are optional but preferred

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}