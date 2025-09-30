import { Component, Panel, Text, Image } from '@bedrock-core/ui';

export function ExampleComponent(): Component {
  return Panel({
    width: 100,
    height: 250,
    x: 10,
    y: 10,
    children: [
      Panel({
        width: 200,
        height: 20,
        x: 50,
        y: 15,
        children: [],
      }),
      Panel({
        width: 200,
        height: 20,
        x: 40,
        y: 10,
        children: [
          Text({
            width: 200,
            height: 20,
            x: 400,
            y: 40,
            value: 'server only custom ui!!!!',
          }),
          Text({
            width: 200,
            height: 20,
            x: 400,
            y: 80,
            value: 'server only custom ui!!!!',
          }),
          Image({
            width: 20,
            height: 20,
            x: 300,
            y: 40,
            enabled: false,
            texture: 'textures/items/apple',
          }),
        ],
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
