---
'@bedrock-core/ui-runtime': major
'@bedrock-core/navigation': major
---

**Breaking.** State is readonly.

`useState` and `useReducer` hand back the value as `Immutable<T>` — deeply readonly — and
the tuple itself is readonly. A render happens because a setter ran, so a value written in
place (`state.count++`, `items.push(x)`) changed what the next render would draw and told
nobody; on a compiled screen it is worse, because the build measured the value it was
given. Changing state means producing a new value and handing it to the setter, which is
now what the types say.

```tsx
const [items, setItems] = useState<string[]>([]);

items.push(name);            // error: readonly
setItems([...items, name]);  // what it always had to be
```

A reducer reads its state the same way: `(state: Immutable<S>, action: A) => S`.
`Immutable`, `StateSlot`, `StateUpdate` and `ReducerSlot` are exported for code that names
the types directly.

`NavigationState`'s `routeNames` and `routes` are readonly for the same reason — a
navigation state is what a reducer produced, never something to edit in place.
