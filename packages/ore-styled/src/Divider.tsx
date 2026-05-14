import { Text, type ControlProps, type JSX } from '@bedrock-core/ui';

export interface DividerProps extends ControlProps {
  children?: JSX.Node;
}

export function Divider(_: DividerProps): JSX.Element {
  return (
    <Text>{'TODO'}</Text>
  );
}
