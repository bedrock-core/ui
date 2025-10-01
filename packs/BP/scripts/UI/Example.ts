import { Component, Panel, Text, Image, Fragment } from '@bedrock-core/ui';

export function Example(): Component {
  return Fragment({
    width: 854, height: 480, x: 0, y: 0, children: [
      // Center panel with logo
      Panel({
        width: 200, height: 36, x: 327, y: 222, children: [
          Image({ width: 200, height: 36, x: 327, y: 222, texture: 'textures/ui/core-ui/logo' }),
        ],
      }),

      // Right panel with text
      Panel({
        width: 100, height: 250, x: 580, y: 75, children: [
          Text({ width: 180, height: 20, x: 585, y: 80, value: 'Right Side Text 1' }),
          Text({ width: 180, height: 20, x: 585, y: 110, value: 'Right Side Text 2' }),
        ],
      }),

      // Image in top left corner
      Image({ width: 32, height: 32, x: 10, y: 10, texture: 'textures/items/apple' }),

      // Text in bottom right corner
      Text({ width: 150, height: 20, x: 694, y: 450, value: '§l§gCustom text!' }),
    ],
  });
}
