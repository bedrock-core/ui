# Design notes

What is built is documented on the [docs site](https://bedrock-core.drav.dev/docs/ui). This
folder holds the measurements the code's comments cite.

| Page | What it is |
| --- | --- |
| [S1-form-entry](./spikes/S1-form-entry.md) | Whether a placed control can own a form entry. |
| [S3-modal-entry](./spikes/S3-modal-entry.md) | Whether a compiled control can own a modal field. |
| [S4-toggle-group](./spikes/S4-toggle-group.md) | Whether a toggle group is client-only. |
| [S5-compiled-cost](./spikes/S5-compiled-cost.md) | Whether a compiled screen is measurably cheaper to open than one assembled at runtime. |
| [S6-runtime-rect](./spikes/S6-runtime-rect.md) | Whether a control re-lays when its size binding changes while open. |
| [S7-entry-field](./spikes/S7-entry-field.md) | Which of a form entry's two strings carries a value. |
| [S8-gate-construction](./spikes/S8-gate-construction.md) | Whether a gate can keep a compiled screen from being built, not just from being drawn. |
| [S9-row-typed-factory](./spikes/S9-row-typed-factory.md) | Whether a row-typed factory can give a compiled slider its value back. |
| [S10-lang-pieces](./spikes/S10-lang-pieces.md) | Whether a compiled line can hold pieces whose text differs per language. |
| [S11-factory-variants](./spikes/S11-factory-variants.md) | Whether a factory can build only the element a screen needs, where it needs it. |
| [S12-live-layout](./spikes/S12-live-layout.md) | What a compiled screen can change at runtime beyond text and visibility: size, position, alpha. |
| [S13-chest-look-carrier](./spikes/S13-chest-look-carrier.md) | Whether a chest button's own slot can carry which look it wears: the transport's stack size. |
| [S14-custom-item-carriers](./spikes/S14-custom-item-carriers.md) | Whether custom items can carry the chest protocol without vanilla ids, and whether a press can be a drop. |
| [jsonui-container-facts](./spikes/jsonui-container-facts.md) | The rules the container backend is built on: slot addressing, what a slot publishes, and what the Script API allows around a container. |

Each spike is one probe in a test addon, driven by a custom command, with its numbers recorded
whichever way they go. The probe is deleted once the page is written.
