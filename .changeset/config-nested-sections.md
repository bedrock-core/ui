---
'@bedrock-core/config': minor
---

Nested config sections: named, navigable, and unbounded in depth.

A schema group can now name itself with `$label` and `$description`, and the config UI renders the tree as authored rather than collapsing everything below the first dot:

```ts
server: {
  economy: {
    $label: 'Economy',
    $description: 'Money, prices and tax.',
    pricing: {
      $label: 'Pricing',
      taxRate: { type: 'number', default: 5, min: 0, max: 100, label: 'Tax Rate' },
    },
  },
}
```

**A level that holds only sub-sections becomes a screen of buttons; a level that holds settings is the form.** That split is forced by the platform — a native modal's only controls are its submit and its dismiss, so a form has no way to offer "open this sub-section". Any groups nested *under* a form still render inline, indented per level.

Requires `@bedrock-core/server-runtime` with the `core-config/groups` state key to show declared names. Against an older runtime the group map is empty and sections fall back to the key-derived titles they always used, so nothing breaks — it just stays unnamed.

**Lists are editable in the UI now.** A list has no native modal control, so it used to be read-only everywhere with only a chat command to change it. It no longer counts as "forces a form" — a level holding only lists and sub-sections is a button screen, and each list gets a row that opens a real editor (items as rows, press to remove, add via a native text field or a dropdown of the unused options, `maxItems` respected). A list stranded on a level that *does* have fields still falls back to naming its command, because there is genuinely no button to give it there.

**New `multiselect` entry type** — any number of a fixed option set, drawn as one checkbox per option inside the modal and stored as the array's JSON, exactly like a list:

```ts
features: { type: 'multiselect', options: ['pvp', 'tp', 'shop'], default: ['pvp'], label: 'Enabled Features' },
```

**Enums with 5 options or fewer render as inline toggle-button segments** instead of a dropdown — every choice visible, one press to change. Past 5 the segments get too narrow to read and it falls back to the dropdown.

Type pass: field captions are `scale: 0.9` and bold, descriptions `scale: 0.8` and muted, a heavier rule between properties and a light one under each section title. The caption change lives in `theme.components.form.labelStyle` (new `bold` token), so it applies to every ore-styled form, not just config. `fieldLabel` is now exported from `@bedrock-core/ore-styled` for captions composed outside a `Form.*` wrapper.

**The `Config` route now requires a `path` param** (`''` for a whole scope). `openConfig` still works; new code should call `openScopeRoot`, which picks buttons-or-form for you.
