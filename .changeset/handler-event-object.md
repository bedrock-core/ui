---
'@bedrock-core/ui-runtime': minor
'@bedrock-core/ore-styled': minor
---

**Breaking.** Every handler now takes one event object instead of positional arguments.

```tsx
// before
<Button onPress={(player, host) => …} />
<Slot onInsert={(player, stack, host) => …} />
<Container onOpen={(player, host) => …} />
<Form onSubmit={values => …} onCancel={() => …} />

// after
<Button onPress={({ player, host }) => …} />
<Slot onInsert={({ player, stack, host }) => …} />
<Container onOpen={({ player, host }) => …} />
<Form onSubmit={({ player, values }) => …} onCancel={({ player }) => …} />
```

`player` is always the player the event is about — the viewer on a form, and on a container screen the player who moved the item. `host` is the entity that owns the screen, so it is present exactly on screens an entity owns; `Form.onSubmit` now carries the submitting player alongside `values`, which a form previously had to reach through `usePlayer()`.

What a handler receives can now gain a field without changing a single call site, which is why this lands before 1.0: a form knows its viewer and no entity, a container screen knows both, and each host added after this knows something else again. The new types — `UiEvent`, `PressEvent`, `ContainerEvent`, `SlotEvent`, `SubmitEvent` — are exported from the package root.

Custom native components (`registerComponent`, `ComponentDescriptor`, `Writer`, the `emit*` helpers) are now marked **experimental**: they are bound to the serialization wire format rather than to the component API, and that format changes with compiled screens. Everything else in the package is stable at 1.0.
