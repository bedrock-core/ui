# S10 — can a compiled line hold pieces whose text differs per language

**Status: answered 2026-09-17 — yes. A line split into label pieces keyed per language is laid out
by the client at the widths it draws, and a press sized to a piece covers exactly that piece in
every language.**

## The question

A compiled screen is laid out at build, in one language. A label the client wraps itself cannot
carry a press over part of its text, because where a word lands depends on the language the
client draws. The other way round is for the build to break each language's text into lines and
pieces itself, write every piece as a key whose value differs per language, and let a native
stack place the pieces. That needs a piece a language does not use to draw nothing, and a press
that takes its size from the piece it covers.

## Measured

One probe screen on a plain action form, read in `en_US` and `es_ES`.

| Atom | Result |
| --- | --- |
| A value left blank (`key=`) | The client draws the key itself, in every language. |
| A key missing from `es_ES.lang` | The `en_US` value is drawn. |
| A value of only `§r` | Draws nothing and is 0 wide. |
| Height of a `default` label holding no text, or only `§r` | One line. It never collapses. |
| Spaces at the start or end of a value | Kept. |
| A press sized to a `default` label, in the shape below | Exact in both languages; hover draws over the piece only. |
| The same with the panel sized `100%c` | The press drops below the label and widens the row. |

## The shape

```json
"link_piece": {
  "type": "panel",
  "size": ["100%cm", "100%cm"],
  "controls": [
    { "label": { "type": "label", "size": ["default", "default"], "text": "<key>", "layer": 2 } },
    { "press": { "type": "button", "size": ["100%sm", "100%sm"], "layer": 1 } }
  ]
}
```

`100%cm` sizes the panel to its largest child, the label, and `100%sm` sizes the press to its
sibling. Pieces sit in a horizontal `stack_panel` sized `["100%c", <line height>]`. A `§r` piece
between two others leaves them touching, and a press over it draws no box.

## Consequences

- A piece a language does not use is `§r`, never a blank value.
- Every language file carries every piece key; a missing one draws English.
- A line no piece of a language uses still takes a line of height, so a block split this way is
  as tall as its longest language unless shorter languages are spread over the same line count.

## The probe

Deleted after this page was written: `RP/ui/probe/lang_flow.json` in the showcase addon, gated on
its own form title, mounted through a `server_form.json` modification, and opened by a custom
command.
