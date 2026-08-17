---
'@bedrock-core/config': minor
---

List settings are reachable: four command verbs, and the config screen names every list it cannot edit.

**Breaking for anyone reading the enums.** `<ns>:verb` now holds `get`, `set`, `add`, `remove`, and both setting enums hold every key the schema declares — `list` entries included.

A `list` was the one entry type nothing could touch from outside code. It has no native modal control, and a modal form's only buttons are its submit and its dismiss, so there is no third control to route an editor screen from; it was excluded from the command enums as well, on the reasoning that a list has no single-value spelling and offering the key could only fail on submit. Between the two, a setting an addon deliberately exposed was invisible to the player who owned it. Chat is the only surface left, so chat is where the spelling was added:

```text
/<ns>:config get moderation.bannedItems
moderation.bannedItems = [tnt, lava_bucket] (2/50)

/<ns>:config set moderation.bannedItems tnt, lava_bucket, bedrock
/<ns>:config add moderation.bannedItems flint_and_steel
/<ns>:config remove moderation.bannedItems tnt
```

`add` and `remove` exist because `set` alone would mean retyping the whole list to change one entry, and getting one item wrong silently drops it. `get` brackets the items and appends `(count/maxItems)` when the schema caps the list, with `(empty)` for an empty one — `[]` reads as much like a screen that failed to render as like a setting with nothing in it. `set` splits on commas and trims each item, so `set <key> ""` is how a list is cleared.

Everything is refused rather than quietly accepted: adding an item already present, adding past `maxItems`, removing an item that is not there, setting more items than `maxItems` or naming one twice, and — for `itemType: 'enum'` — any item outside `options`, whose failure lists every value that would have worked, since the enum autocompletes the *setting* and never the item. `add` and `remove` pointed at a non-list key say so and name it; `get` and `set` on a non-list key behave exactly as they always have. All four verbs work on `:configat` too, with the same arity rule the old two had: the item comes first, the target after it.

A list is stored as one flat key holding its array's JSON, which is what the runtime's own flattening produces, so a command patches it exactly like a scalar — through the same `system.run()` deferral, because a dynamic-property write cannot happen inside a command callback.

**The config screen shows lists instead of apologizing for them.** It used to print one muted line saying list settings were code-only, naming none of them. Each list field now gets its label, its description, its current items against `maxItems`, and the command that changes it — spelled for whoever is looking: `:config` when a player is on their own player scope, `:configat` with the scope inside the key otherwise. A scope holding *only* lists used to be a dead end with a sentence in the middle of it; it now shows the same block in a scrollable card, since a form with no fields is not a form.

Every new string is an i18n resource (`core.command.list.*`, `core.config.lists.*`) and command replies resolve through the world-published bundle in the runner's own language, which is the first command output in this package that does. The older parse and permission messages are still hardcoded English. The framework's built-in guide covers the two new verbs. The deleted `list:` resources and the `config.listOnly` / `config.unknownList` / `config.listsElsewhere` keys went with the list screen that used them.
