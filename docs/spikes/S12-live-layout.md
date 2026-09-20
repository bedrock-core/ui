# S12 — what a compiled screen can change at runtime, beyond text and visibility

**Status: answered 2026-09-17 over nine rounds. A compiled screen can size a static control from a
binding, and place one by sizing a spacer beside it. The number may be any value: an entry's text
becomes a number with `(#value - 0)`. Anchored offsets work only in cells the engine's own factory
builds, and a computed-length factory cell takes no bound geometry at all.**

## Why it was asked

Every property of an element should be able to be static, one of a closed set, or carried at
runtime. What the engine allows decides which. Rules r10 and the S6 spike said a bound size was
inert inside a subtree inserted through `modifications`, which is where every compiled screen
lives — so the question was whether live geometry is possible at all.

## The probe

A panel mounted beside `claimed` in `hosts/form/action_container.json`, drawn for the title
`corev0009spike:lab`, shown by a command as an action form whose entries carried the values under
test. One lettered row per question, read against a 100-pixel track. Asserts on; `yarn gamelog`
after every round.

## Measured

**What binds**

| Property | Static control | Cell of a computed-length factory (S11) | Cell of the engine's `form_buttons` factory |
| --- | --- | --- | --- |
| `#size_binding_x/y` | **yes** | no | **yes** |
| `#anchored_offset_value_x/y` | no | no | **yes** |
| `alpha` through `"alpha": "#alpha"` | yes, but only 0 or 1 | — | yes, same |
| `visible`, text, `#collection_length` | yes | yes (S11) | yes |

- **A value in a property bag is never applied** — for size, offset or alpha, static or in a cell.
  Only a binding writes them.
- **Units are multiples of the parent's size.** A control inside a `[1, 1]` frame is therefore
  sized and offset in pixels, which is what the old interpreter's `[1,1]` label frame was for.
- **A bound size needs both axes.** Binding only the width leaves the height at 0, which draws
  nothing and looks exactly like a binding that did not apply.

**Arithmetic in a view binding**

- **`(#value - 0)` parses a numeric string.** `'35' - 0` is 35. This is the only parse that worked:
  `(#value + 0)` concatenates into `'350'`, `(1 * #value)` gives 0, and `(#value * 1)` gives 0.
- Comparisons and arithmetic over integers work: `((#v = '35') * 35)` and sums of such terms, which
  is how a closed set of values reaches a property without parsing anything.
- **The arithmetic is integer.** `((#v = #v) * 0.3)` gives 0, so a fraction cannot be computed; a
  fractional `alpha` has to be a literal on a compiled variant.
- `+` joins two strings, unless both look numeric, in which case it adds. Digit-by-digit decoding
  of a padded number is therefore unreliable, and unnecessary given `- 0`.

**Every binding must read a property**

A view binding whose expression names no `#property` fails to parse:

```
JSON UI parse failure: Must define a source property name in the binding!
```

The control's **whole** bindings array is then dropped, so one literal expression silently disables
every other binding on that control. Write a constant as `((#v = #v) * 40)`.

**What reflows**

- A stack moves its next child when a sibling's bound size changes, and when a gated variant of a
  different width is built in its place.
- A box sized `100%cm` with its background sized `100%sm` **shrinks when a row inside it hides**,
  and everything below moves up.
- Since a bound size reflows a stack, **position comes from size**: a spacer before a control, sized
  by a binding, places it. That is the only way to place a static control, because anchored offsets
  do not bind there.

## What it changes

- A closed set of looks, sizes or positions compiles as variants, built only when chosen (S11).
- An open number can drive a size, and a position through a spacer, on ordinary compiled controls.
  The value rides an entry as text and is read with `(#value - 0)`.
- A control whose size is bound sits inside a `[1, 1]` frame, and binds both axes.
- Fractions (`alpha`, a colour) are literals on variants, never computed.
