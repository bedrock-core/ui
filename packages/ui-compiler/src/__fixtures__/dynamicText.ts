import { Text, useState, type TextProps, type JSX } from '@bedrock-core/ui-runtime';

/** A state-backed text value for tests of compiled carrier rendering. */
export function dynamicText(props: TextProps): JSX.Element {
  const [value] = useState(typeof props.children === 'string' ? props.children : '');

  return Text({ ...props, children: typeof props.children === 'string' ? value : props.children });
}
