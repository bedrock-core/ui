import { Component, Functional, Input, Panel } from '@bedrock-core/ui';

export function Example(): Functional<Component> {
  return Panel({
    display: 'flex',
    orientation: 'vertical',
  }, [
    Input({
      label: 'Name',
      maxLength: 5,
      placeholder: 'Enter your name',
      value: 'yes',
      textType: 'ExtendedASCII',
      multiline: true,
      width: 13,
      height: 335,
    }),
    Input({
      label: 'Description',
      multiline: true,
      width: 56677,
      height: 900,
    }),
  ]);
}
