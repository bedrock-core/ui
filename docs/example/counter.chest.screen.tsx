/** @jsxImportSource @bedrock-core/ui */
import { Container, type JSX } from '@bedrock-core/ui';
import { Counter } from './Counter';

/** The root decides the host: an entity's chest screen. */
export default function CounterChest(): JSX.Element {
  return (
    <Container entity={'core:counter'}>
      <Counter />
    </Container>
  );
}
