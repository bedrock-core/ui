---
'@bedrock-core/ui-runtime': minor
---

**Breaking.** Fields are top-level components, and `Form.Button` is the one member `Form` keeps.

`Form.Toggle`, `Form.Slider`, `Form.Dropdown`, `Form.Input` and `Form.Option` are now `Toggle`, `Slider`, `Dropdown`, `Input` and `Option`, and `Form.InlineSelect` is `Select`. Their prop types follow: `ToggleProps`, `SliderProps`, `DropdownProps`, `InputProps`, `OptionProps` and `SelectProps` replace the `Form*Props` names. `Form.Button`, with `type` `submit` or `exit`, stays.

Each field asks its host what it becomes. Inside a `<Form>` it is the engine's own field, answered on submit. On a `<Screen>` or a `<Container>`, `Toggle` is a button that flips its state and calls `onChange`, and `Select` is a button per `Option` calling `onChange` with the option's `value`; `on` and `value` hold the state from outside. `Input`, `Slider` and `Dropdown` are refused anywhere but a `<Form>`.

`Select` takes `multiple` for any number of choices. Inside a `<Form>` each option is a native toggle answering under the select's `name`, and `values[name]` is the indices that are on; elsewhere `onChange` receives every chosen value. `Option` takes `color`, `colorSelected` and `dropSelected`, and `Select` their `optionColor`, `optionColorSelected` and `optionDropSelected` defaults, so a label can say which state its option is in.

`Tabs` takes `tabBackground`, `tabHover` and `tabSelected`, the faces its headers are drawn on, unstyled by default.

```tsx
<Form onSubmit={({ values }) => save(values)}>
  <Toggle name={'music'} defaultValue={true} />
  <Slider name={'volume'} min={0} max={10} />
  <Form.Button type={'submit'}>{'Save'}</Form.Button>
</Form>
```
