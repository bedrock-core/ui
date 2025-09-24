import { Component, Text } from '@bedrock-core/ui';

export function ExampleComponent(): Component {
  return Text({
    height: '40',
    width: '100',
    x: '100',
    y: '40',
    value: 'Player Settings',
  });

  // return Panel({
  //   height: '500',
  //   width: '2000',
  //   x: '0',
  //   y: '0',
  //   children: [
  //     Text({
  //       height: '40',
  //       width: '100',
  //       x: '100',
  //       y: '40',
  //       value: 'Player Settings',
  //     }),
  //     Text({
  //       height: '40',
  //       width: '100',
  //       x: '100',
  //       y: '90',
  //       value: 'Player Settings 2',
  //     }),
  //   ],
  // });
}
