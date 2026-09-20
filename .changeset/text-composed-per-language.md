---
'@bedrock-core/ui-runtime': minor
'@bedrock-core/ui-compiler': minor
'@bedrock-core/ore-styled': minor
---

Text whose shape depends on what it says can be composed by the build in every language the pack ships.

- `<Trans>` draws a translated text whose tags are components, as react-i18next's does: `i18nKey` (or `translations` by locale) and `components` by tag name or index. A `<Text>` component styles its tag's content, and any other component is a press hugging it; `<br/>`, `<strong>` and `<i>` are built in. The build breaks the text into the same number of lines in every language, and each component lands exactly where its text is drawn. A screen whose presses run handlers carries the layout in its snapshot, so a render at runtime emits the same entries.
- `useComposed` composes a string per language at the width the layout gives a box.
- `<Button hug>` sizes a press to the text inside it.
- A baked breadcrumb trail (`Trail segments`, `Header title` and `breadcrumbs`) is one label per language, collapsed the way a live trail is.
