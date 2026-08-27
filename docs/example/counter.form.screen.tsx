/** @jsxImportSource @bedrock-core/ui */
import type { JSX } from '@bedrock-core/ui';
import { Counter } from './Counter';

/** No special root: a server form (form-action host). */
export default function CounterForm(): JSX.Element {
  return <Counter />;
}
