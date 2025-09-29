import { Component, Panel, Text } from '@bedrock-core/ui';

export function ExampleComponent(): Component {
  return Panel({
    width: 100,
    height: 250,
    x: 10,
    y: 10,
    layer: 100,
    children: [
      Panel({
        width: 200,
        height: 20,
        x: 40,
        y: 10,
        layer: 100,
        children: [],
      }),
      Text({
        width: 200,
        height: 20,
        x: 40,
        y: 10,
        value: 'Hello World',
      }),
    ],
  });
}
