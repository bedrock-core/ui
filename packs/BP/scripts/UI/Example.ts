import { Component, Panel } from '@bedrock-core/ui';

export function ExampleComponent(): Component {
  return Panel({
    width: 100,
    height: 250,
    x: 10,
    y: 10,
    layer: 100,
    children: [],
  });
}
