# Rendering rules

Button appearance and input are separate contracts. A successful callback does
not establish that the correct face was painted.

## Button faces

Ordinary Button states own their captions and icons. Keep them inside the state
control and above its background. `stateFace` uses background layer `1` and
content layer `12`; panel backgrounds use `over()` to lift their children.

Contextual navigation inputs share a caption box. Their input surfaces fill that
box while the shared caption stays above the surfaces in the content layer.

Layers are relative to the parent. Compare the full ancestor chain when two
controls overlap. Sibling array order does not establish a reliable paint order
at equal layers. An active face and a passive disabled face occupy the same
rectangle, so verify their visibility as well as their layers.

Keep availability intact when changing paint order: an unavailable button must
retain its disabled appearance under the pointer. Raising an active face is
insufficient if it also covers the disabled state.

Native buttons own the visibility of their default, hover and pressed controls.
Place application visibility gates inside or outside that state boundary; do not
give a binding and the button state machine ownership of the same control.

Native radio inputs share their group's collection scope. Read form-carried
visibility and membership values through separate data sources; keep the radio
controls outside those data sources' indexed collection items.

## Icon buttons in content-sized rows

Give an icon-only button an explicit square size when its row derives height
from its children. Percentage height cannot establish that row's height. Match
the text buttons' measured line height plus vertical padding so the icon keeps
the same hitbox and stays inside the footer with or without pagination.

## Native regression

From `examples/`, run:

```powershell
corepack yarn workspace @bedrock-core/ui-tests check:catalog-faces
corepack yarn workspace @bedrock-core/ui-tests test:catalog-faces
```

The ClientRunner suite opens the production Economy, Shop and Showcase catalogs
from copies of their complete built packs. It checks Config and Guide at rest,
under the pointer and after moving away. Separate native forms supply explicit
unavailable Config and Guide entries through the same generated Catalog UI.

Use bevel and outer-border pixels to distinguish faces. The Ore secondary hover
and disabled textures share fill colors; their outer borders differ. Screen
recognition uses the Catalog header and divider, outside the tested buttons.
Captures and per-state pixel observations are retained under
`examples/ui-tests/test-results/catalog-faces/`.

`test:guide-history` checks actual Guide footer borders, square Index geometry
and alignment with Previous/Next, alongside local Back and server boundaries.
Its captures and measured bounds are retained under
`examples/ui-tests/test-results/guide-history/`.
