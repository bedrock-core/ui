---
'@bedrock-core/ui-runtime': major
---

**Breaking.** A screen is drawn from the pack, or not at all.

`render()` refuses a root the build never compiled, naming the two things that produce one: the ui-compiler filter seeing the screen, and `@bedrock-core/generated/ui` being imported so its registrations run (the filter now adds that import itself). With that, the half of the runtime that described a screen on every present is gone — the serializer's tree walk, the action-form and modal presenters, the writers that filled the ActionForm slots, and the byte map `withControl` carried for them.

What a compiled screen still cannot bake stays: a chooser's options are data the build cannot know, so they are packed and reach the pack through `ModalFormData`'s own items array; a modal's fields are the engine's on any path, so the typed calls that make them stay too.

Removed from `@bedrock-core/ui-runtime`: `Input`, `Dropdown`, `Slider` and `ModalFieldProps` — the one-modal-per-field primitives, superseded by `Form.Input` / `Form.Dropdown` / `Form.Slider` inside a `<Form>`, which draw every control in one modal. Also `ScrollLimitError`, `MAX_SCROLLS`, `MAX_POOLED_SCROLLS` (a compiled screen emits a region per `<Scroll>`, so there is no pool to run out of), and `emitButton` / `emitHeader`. `registerComponent` no longer takes a `writer` for anything but a native modal field.

Removed from `@bedrock-core/config`: `App`, `AppProps`, `AppRoutes` and `AppScreen`. Every screen the config UI needs is compiled now.
