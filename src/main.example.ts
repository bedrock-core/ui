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
    height: '500',
    width: '2000',
    x: '0',
    y: '0',
    children: [
      Text({
        height: '40',
        width: '100',
        x: '100',
        y: '40',
        value: 'Player Settings',
      }),
      Text({
        height: '40',
        width: '100',
        x: '100',
        y: '90',
        value: 'Player Settings 2',
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
