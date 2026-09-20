# S3 — can a compiled control own a modal field?

**Status: answered 2026-08-28. Both halves.** Unblocks the `form-modal` host.

> A control the pack places owns a `custom_form` row on the same terms S1 found for `form_buttons`: the control itself carries a `collection_details` binding on the collection, under a host supplying `collection_index`.

> A `label()` **is** a row in `custom_form`, and it is also a slot in `formValues`, holding `null`. The two sides are ALIGNED one-to-one: the row a compiled control reads at index *n* is the value the response carries at index *n*.

## The two halves

They are independent, and **half A may settle the design on its own** — run it first, it needs no render pack.

| | Question | How to read it |
| --- | --- | --- |
| **A — alignment** | Does a `label()` occupy a slot in `formValues`? | Chat prints `len=`. `2` = labels are free, a compiled screen may decorate anywhere. `3` = every baked index shifts by the labels above it, and decoration must be drawn by the pack rather than added as a field. |
| **B — read** | Can a control the pack places read a field by a baked `collection_index` on `custom_form`? | Three rows drawn over the form. Three DIFFERENT labels = yes. All the same, or all blank = no, and only the *drawing* of a modal can be compiled. |

Half B is S1's question on a different collection. S1's answer turned on the control carrying its **own** `collection_details` binding; `custom_form` is a different collection with a different label binding (`#custom_text`), so nothing carries over for free.

## Running it

1. `yarn watch`.
2. **Wooden (oak) button** → half A. Set the first toggle on, leave the second off, submit, read chat.
3. **Sneak + wooden button** → half B. Read the three yellow rows.

## Where it lives

| File | What it is |
| --- | --- |
| `packs/RP/ui/core-ui/spikes/modal_entry.json` | the three rows, and the question in full |
| `packs/RP/ui/core-ui/common/modal_container.json` | one added child, gated on the spike title |
| `packs/RP/ui/_ui_defs.json` | one added line |
| `packs/BP/scripts/spikes/modalEntry.ts` | both halves, and what each outcome means |
| `packs/BP/scripts/main.ts` | the wooden-button branch |

Gated on the title `bcuiv0008SPIKE_S3`, so no other screen sees it.

## Result

**Half B — yes.** Three rows, three different labels, each read through a literal index:

| Row | `#custom_text` at that index |
| --- | --- |
| `S3B[0]` | `alpha` |
| `S3B[1]` | `bravo` |
| `S3B[2]` | `charlie` |

The S1 rule carries over unchanged: the binding must be on the control, not merely on a host above it.

**And a second thing fell out of it.** Running half A's form through the spike rows showed the collection as:

| Index | `#custom_text` |
| --- | --- |
| 0 | `FIELD 0 — set me ON` |
| 1 | `DECORATION — not a field` |
| 2 | `FIELD 1 — leave me OFF` |

So a `label()` occupies a row in `custom_form` and can be read by index like any other. That is the DRAW side, and it is good news: a compiled screen can address decoration.

**Half A — already known, and it should not have been a spike.**

`core/writers.ts` documents this exactly, in the doc comment on `emitLabel`, and the interpreter already handles it by advancing `modalControlIndex` without registering an entry. The comment even records the same empirical result — "a form with decorative `<Panel>` wrappers among its fields returned a `formValues` array 1 entry longer per label, with every later control's value shifted".

Measuring it again cost an in-game round and produced no new information. The lesson is the same one S6 kept teaching: **read what the repo already knows before asking the engine.**

The re-measurement, for the record — submitting toggle / label / toggle returned:

```
len=3  [true, null, false]
```

The question was framed as a risk — "if a label costs an index, every baked index shifts" — and the answer inverts it. `formValues` carries **one slot per `custom_form` row**, `null` where the row holds no value. So the two sides are aligned, and a compiled control baked with index *n* reads the row that the response reports at index *n*. Nothing shifts, because nothing is skipped.

Had labels been *absent* from `formValues`, the compiler would have had to keep two counts — a draw index and a response index — and reconcile them per screen. It has to keep one.

Half A was asked wrong the first time: it carried the protocol header in its title, so the library claimed the form and hid every native row it did not recognise, leaving nothing to set and nothing to submit. It runs on a plain title now and needs no render pack at all, which is what it should always have been.

## Verdict

**The form-modal host is unblocked, on one genuinely new finding and one that was already written down.**

1. **New — half B.** A compiled control reads a modal field by a baked `collection_index` on `custom_form`, carrying its own `collection_details` binding. S1's rule, unchanged, on a second collection. This is what the spike was for.
2. **Already known — half A.** `custom_form` and `formValues` are aligned one-to-one, `null` for rows that carry no value. Documented in `core/writers.ts` and handled by the interpreter long before this spike ran.

Together those say a form-modal compiles the same way an action form does: **one index space, counted over every row including decoration.** A compiled screen may interleave labels and fields freely; the compiler counts rows, and the runtime reads `formValues` at the same index it baked.

The rule for the emitter:

> Decoration is a row. Count it, bake indices over the full row list, and expect `null` back at every index that draws rather than collects.
