import { Player } from '@minecraft/server';
import type { Component } from './types/component';
import type { CoreUIFormData } from './types/index';

/**
 * Present a component to a player using the @bedrock-core/ui system
 *
 * This is the main entry point for the framework. It:
 * 1. Takes a component or component tree (can be Functional<T> with formFunction)
 * 2. Serializes the component data using the compact protocol
 * 3. Embeds the data into ModalFormData title field
 * 4. Adds interactive components to ModalFormData using their formFunction properties
 * 5. Shows the form immediately to the player
 * 6. The companion resource pack handles the actual rendering
 *
 * @param player - The player to show the UI to
 * @param component - Component or component tree to display (Functional<T> or Component)
 * @returns Promise that resolves when the form is presented
 *
 * @example
 * ```typescript
 * import { present, Panel, Text, Button } from '@bedrock-core/ui';
 *
 * const ui = Panel({
 *   display: 'flex',
 *   orientation: 'vertical',
 * }, [
 *   Text({ value: 'Player Settings' }),
 *   Button({ label: 'Save' })
 * ]);
 *
 * await present(player, ui);
 * ```
 */
export async function present(form: CoreUIFormData, player: Player, component: Component): Promise<void> {
  component.serialize(form);

  form.show(player).then(() => {
    // TODO STUFF
    // Form shown successfully
  }).catch(error => {
    console.error('Error showing form:', error);
  });
}
