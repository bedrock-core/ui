import { Player } from '@minecraft/server';
import { present, Panel, Text, Button, Input } from './index';

/**
 * Simple Player Settings UI Example
 * Demonstrates the new direct component API
 */
function createPlayerSettingsUI() {
  return Panel({
    display: 'flex',
    orientation: 'vertical',
    children: [
      Text({ value: 'Player Settings' }),

      Input({
        label: 'Username',
        multiline: false
      }),

      Panel({
        display: 'flex',
        orientation: 'horizontal',
        children: [
          Button({ label: 'Save' }),
          Button({ label: 'Cancel' })
        ]
      })
    ]
  });
}

/**
 * Simple Chat UI Example
 * Shows different panel display modes
 */
function createChatUI() {
  return Panel({
    display: 'flex',
    orientation: 'vertical',
    children: [
      // Chat messages area
      Panel({
        children: [
          Text({ value: 'Player1: Hello everyone!' }),
          Text({ value: 'Player2: How are you?' }),
          Text({ value: 'Player3: Great game today' })
        ]
      }),

      // Chat input area  
      Panel({
        display: 'flex',
        orientation: 'horizontal',
        children: [
          Input({
            label: 'Message',
            multiline: false
          }),
          Button({ label: 'Send' })
        ]
      })
    ]
  });
}

/**
 * Simple Menu UI Example
 * Shows basic button list
 */
function createMenuUI() {
  return Panel({
    display: 'flex',
    orientation: 'vertical',
    children: [
      Button({ label: 'Item 1' }),
      Button({ label: 'Item 2' }),
      Button({ label: 'Item 3' }),
      Button({ label: 'Item 4' })
    ]
  });
}

/**
 * Form UI Example
 * Shows different input types
 */
function createFormUI() {
  return Panel({
    display: 'flex',
    orientation: 'vertical',
    children: [
      Text({ value: 'Single line input:' }),
      Input({
        label: 'Name',
        multiline: false
      }),

      Text({ value: 'Multi-line input:' }),
      Input({
        label: 'Description',
        multiline: true
      })
    ]
  });
}

/**
 * Example usage showing how to present UIs to players
 */
export async function showPlayerSettings(player: Player): Promise<void> {
  const ui = createPlayerSettingsUI();
  await present(player, ui);
}

export async function showChat(player: Player): Promise<void> {
  const ui = createChatUI();
  await present(player, ui);
}

export async function showMenu(player: Player): Promise<void> {
  const ui = createMenuUI();
  await present(player, ui);
}

export async function showForm(player: Player): Promise<void> {
  const ui = createFormUI();
  await present(player, ui);
}