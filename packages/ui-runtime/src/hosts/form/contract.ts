/**
 * What a compiled form's JSON UI and its runtime have to agree on.
 *
 * A form is shown to one player and serialized for them when it is shown, so
 * unlike the chest there is no world state to hide anything in: everything the
 * client needs arrives in the title and in the form's own entries. Both are
 * plain strings, which is what makes a form the cheap host — no slot to spend,
 * no poll to run, and no cap on a string's length.
 */

/**
 * The collection every entry is read through. Vanilla's own form screens read
 * it too, which is what lets a compiled control sit beside them.
 */
export const COLLECTION = 'form_buttons';

/**
 * The TEXT every compiled entry is shown with.
 *
 * A form entry carries two strings: its text and its icon path. The text is
 * this fixed payload — one that resolves to a hidden panel — which leaves the
 * icon path (`#form_button_texture`) free to carry the value a compiled
 * control reads. The library's `server_form` hook compares each entry's text
 * against this exact string and draws no icon image when they match, so an
 * entry carrying a channel never draws its channel as a texture.
 */
export const ENTRY_TEXT = 'bcuiv0008s:panel;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;0b:false1';

/**
 * The alphabet a carried flag is written in — a visible, a press's enabled.
 *
 * Letters, not digits: a compiled control reads its entry through string
 * arithmetic (the prefix is sliced off), and the engine types the result of
 * an expression by its look, so a '0' comes out a number and never equals
 * the '0' a gate compares it with.
 */
export const FLAG_ON = 't';
export const FLAG_OFF = 'f';

/** A list's count travels as `n` + decimal digits, for the same reason. */
export const COUNT_PREFIX = 'n';

/**
 * How a control is bound to the entry it draws.
 *
 * A control the pack places itself owns an entry only when THE CONTROL ITSELF
 * carries a `collection_details` binding on this collection. A host above it supplying `collection_index` is enough to
 * READ the entry and enough for the control to be pressed — but not for the
 * press to be attributed, and the failure is silent: the form closes and
 * script sees `canceled`, exactly as if the player had pressed Esc.
 *
 * Every emitted control that reports a press carries it. There is no way to
 * detect a missing one at build time, so it is not optional.
 */
export const DETAILS_BINDING = {
  binding_type: 'collection_details',
  binding_collection_name: COLLECTION,
} as const;

/**
 * The wire the title and the entries are written on.
 *
 * Versioned as a WINDOW rather than a number, the way `@bedrock-core/sync`
 * versions its protocol: a pack decodes a range, a screen is emitted at the
 * newest encoding the pack it was built against decodes, and raising the
 * minimum is the breaking change. Addons update on their own schedules and
 * meet in one world, so a single version would strand whichever half moved.
 */
export const ENCODING_MIN = 1;
export const ENCODING_MAX = 1;

/**
 * The render pack's vocabulary — the definitions compiled screens reference
 * and the `$variables` they take — versioned by the same window rule. An
 * addon's screens are compiled once against one vocabulary and keep
 * referencing it for as long as they ship, and the library cannot rebuild
 * them: a definition or variable a compiled screen references is added under
 * a new version, never changed in place. `resource-pack/protocol.json`
 * declares the same window on the pack side.
 */
export const VOCABULARY_MIN = 1;
export const VOCABULARY_MAX = 1;

/**
 * The header every title carries, compiled or not.
 *
 * Not a decision so much as the shape of the screen we mount on: vanilla's
 * `long_form` hides itself when this is present and the library's own
 * container sizes itself to the screen only then. A compiled screen wants
 * exactly that, so it keeps the header and adds its own marker after it.
 */
export const PROTOCOL_HEADER = 'bcuiv0008';

/** What marks a title as a compiled screen rather than a serialized one. */
export const COMPILED_MARKER = 'core';

/** `bcuiv0008core1:` — what every compiled title of encoding 1 starts with. */
export const compiledPrefix = (encoding: number): string =>
  `${PROTOCOL_HEADER}${COMPILED_MARKER}${encoding}:`;

/**
 * The title a compiled screen is shown with: the header, the encoding, and the
 * screen's key.
 *
 * The key is the screen's namespaced name rather than a number. A chest screen
 * folds its name into 1..3969 because the only thing it can carry a key on is
 * two stack sizes; a title is a string and has no such limit, so the name
 * itself travels and stays readable in a crash log.
 */
export const titleFor = (key: string, encoding: number = ENCODING_MAX): string =>
  `${compiledPrefix(encoding)}${key}`;

/** The screen a compiled title names, or undefined when the title is not one. */
export const keyFrom = (title: string): { readonly encoding: number; readonly key: string } | undefined => {
  if (!title.startsWith(PROTOCOL_HEADER + COMPILED_MARKER)) {
    return undefined;
  }

  const colon = title.indexOf(':', PROTOCOL_HEADER.length);

  if (colon < 0) {
    return undefined;
  }

  const encoding = Number(title.slice(PROTOCOL_HEADER.length + COMPILED_MARKER.length, colon));

  return Number.isInteger(encoding) && encoding >= ENCODING_MIN && encoding <= ENCODING_MAX
    ? { encoding, key: title.slice(colon + 1) }
    : undefined;
};
