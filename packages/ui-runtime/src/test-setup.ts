// Vitest setup: register the built-in native components once per test file so
// the serializer / layout / inherit phases can resolve writers and transparent
// types from the component registry (mirrors what render() does at runtime).
import { __defineItemType } from './__mocks__/@minecraft/server';
import { registerNativeComponents } from './components';
import { IDENTITY, protocolItemDefinitions } from './hosts/chest/contract';

registerNativeComponents();

// The protocol items the build registers for a screen whose host is in the
// `core` namespace, which is the one the container tests use.
for (const { identifier, role } of protocolItemDefinitions('core')) {
  __defineItemType(identifier, { maxAmount: role === 'sentinel' ? 1 : 64, maxDurability: IDENTITY[role] });
}
