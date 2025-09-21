import { Player } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { UISerializer } from './core/serializer';
import { ComponentProcessor } from './core/component-processor';
import { RenderError } from './types/serialization';
import type { Component } from './types/json_ui/components';

/**
 * Present a component to a player using the @bedrock-core/ui system
 * 
 * This is the main entry point for the framework. It:
 * 1. Takes a component or component tree
 * 2. Serializes the component data using the compact protocol
 * 3. Embeds the data into ModalFormData title field
 * 4. Shows the form immediately to the player
 * 5. The companion resource pack handles the actual rendering
 * 
 * @param player - The player to show the UI to
 * @param component - Component or component tree to display
 * @returns Promise that resolves when the form is presented
 * 
 * @example
 * ```typescript
 * import { present, Panel, Text, Button } from '@bedrock-core/ui';
 * 
 * const ui = Panel({
 *   display: 'flex',
 *   orientation: 'vertical',
 *   children: [
 *     Text({ value: 'Player Settings' }),
 *     Button({ label: 'Save' })
 *   ]
 * });
 * 
 * await present(player, ui);
 * ```
 */
export async function present(player: Player, component: Component): Promise<void> {
  try {
    // 1. Validate and flatten component tree
    const validation = ComponentProcessor.validateComponentTree(component);
    if (!validation.isValid) {
      throw new RenderError(`Component validation failed: ${validation.errors.join(', ')}`);
    }

    const flattenedComponents = ComponentProcessor.flattenComponentTree(component);

    // 2. Serialize component data using compact protocol for JSON UI rendering
    const serializedData = UISerializer.serialize([component]);

    // 3. Create ModalFormData with embedded data in title
    const modalForm = new ModalFormData()
      .title(serializedData)
      .submitButton('OK');

    // 4. Add interactive components to ModalFormData for native form functionality
    ComponentProcessor.addComponentsToModalForm(modalForm, flattenedComponents);

    // 5. Present the form immediately to the player
    // The companion resource pack's JSON UI system will parse the title
    // and render the sophisticated UI components, while the native form
    // provides the interactive functionality
    await modalForm.show(player);

  } catch (error) {
    // Handle errors gracefully
    if (error instanceof RenderError) {
      throw error;
    }

    // Wrap other errors in RenderError
    const message = error instanceof Error ? error.message : String(error);
    throw new RenderError(`Failed to present UI: ${message}`);
  }
}