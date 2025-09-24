import { Player } from '@minecraft/server';
import { Panel, Text } from './core/components';
import { present } from './present';
import { Component } from './types';

/**
 * Simple Player Settings UI Example
 * Demonstrates the new direct component API
 */
function ExampleComponent(): Component {
  return Panel({
    height: 'auto',
    width: 'auto',
    x: '0',
    y: '0',
    children: [
      Text({
        height: 'auto',
        width: 'auto',
        x: '0',
        y: '0',
        value: 'Player Settings',
      }),
      Text({
        height: 'auto',
        width: 'auto',
        x: '0',
        y: '0',
        value: 'Player Settings',
      }),
    ],
  });
}

/**
 * Example usage showing how to present UIs to players
 */
export async function showExample(player: Player): Promise<void> {
  await present(player, ExampleComponent());
}
