// Vitest setup: register the built-in native components once per test file so
// the serializer / layout / inherit phases can resolve writers and transparent
// types from the component registry (mirrors what render() does at runtime).
import { registerNativeComponents } from './components';

registerNativeComponents();
