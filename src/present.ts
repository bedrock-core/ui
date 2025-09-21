import { Player } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { UISerializer } from './core/serializer';
import { jsxToComponent } from './jsx/runtime';
import { RenderError } from './types/jsx/serialization';
import type { ComponentFunction } from './types/jsx/types';

/**
 * Present a React-like component to a player using the @bedrock-core/ui system
 * 
 * This is the main entry point for the framework. It:
 * 1. Renders the React-like component tree
 * 2. Serializes the component data using the compact protocol
 * 3. Embeds the data into ModalFormData title field
 * 4. Shows the form immediately to the player
 * 5. The companion resource pack handles the actual rendering
 * 
 * @param player - The player to show the UI to
 * @param ComponentFunction - React-like component function that returns JSX
 * @returns Promise that resolves when the form is presented
 * 
 * @example
 * ```typescript
 * import { present, Panel, Text, Button } from '@bedrock-core/ui';
 * 
 * function PlayerSettings() {
 *   return (
 *     <Panel layout="vertical" padding={15}>
 *       <Text fontSize="large">Player Settings</Text>
 *       <Button variant="primary" text="Save" />
 *     </Panel>
 *   );
 * }
 * 
 * await present(player, PlayerSettings);
 * ```
 */
export async function present(player: Player, ComponentFunction: ComponentFunction): Promise<void> {
  try {
    // 1. Render the React-like component tree
    const componentTree = ComponentFunction();

    // 2. Convert JSX element to internal component representation
    const component = jsxToComponent(componentTree);

    // 3. Serialize component data using compact protocol
    const serializedData = UISerializer.serialize([component]);

    // 4. Create ModalFormData with embedded data in title
    const modalForm = new ModalFormData()
      .title(serializedData)
      .submitButton('OK');

    // 5. Present the form immediately to the player
    // The companion resource pack's JSON UI system will parse the title
    // and render the sophisticated UI components
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