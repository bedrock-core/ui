---
'@bedrock-core/ui-runtime': major
'@bedrock-core/navigation': major
'@bedrock-core/guides': major
'@bedrock-core/ore-styled': minor
'@bedrock-core/config': major
'@bedrock-core/ui-compile': minor
---

**Breaking.** Screens are navigated by key, and a screen of links can be shown by an addon that
has none of its script.

Every compiled screen has a key — `<addon>:<name>`, written by the build beside the title it is
drawn by — and a press that opens another screen names that key rather than closing over a handler:

```tsx
<Link to="shop:home">Shop</Link>
```

Because the target is data on the tree, the build can read it. `addonReference(ns)` reduces this
addon's static screens to what showing them needs — per screen the title, the value each entry
carries, and the key each press leads to — and a realm that holds that table can show another
addon's screens from the pack every client already has, following the links as it goes
(`presentReference`). That is now how a guide is read across addons.

New in `@bedrock-core/ui-runtime`: `Link`, `navigate`, `back`, `openScreen`, `setNavigator`,
`addonReference`, `screenReference`, `presentReference`, `isAddonReference`, `isScreenReference`,
`compiledKeyOf`, `screenForKey`, `compiledScreens`, and the `ScreenKeys` interface a build's
generated module augments so an addon's own keys are typed. `registerCompiledScreen` now takes
`{ key, title, snapshot }` instead of positional arguments — it is called by generated code, which
the build rewrites.

Keys autocomplete: the ui-compile filter writes `packs/data/ui/screens.generated.d.ts` back into the
project — the way the i18n and guides filters commit their declarations — so the editor offers this
addon's keys in `navigate()` and `<Link to>` while another addon's key, which this build never saw,
is still accepted.

`@bedrock-core/navigation` is the key navigator: `navigate('<addon>:<screen>')`, `replace`, `reset`,
`back(player)`, `canGoBack`, `currentKey`, `historyOf`, `useNavigation()` inside a screen, and
`provideReferences(lookup)` to say what resolves a key this bundle did not compile. Coming from the
stack navigator: `push` is `navigate` (it always stacks), `goBack` is `back`, `reset` takes a key
instead of a route array, and `setParams` is `replace(key, player, { params })` — a compiled screen
is drawn from the pack each time it is shown, so new params mean showing it again. The stack is a stack of KEYS — a compiled screen's shape
is frozen, so a stack of components swapped inside one root cannot exist; `createStackNavigator`,
`NavigationContainer`, `useRoute`, `stackReducer` and their types are gone.

`@bedrock-core/guides`: `createGuide` is removed — a guide is its compiled screens, and a page is a
screen rather than a state of one. `guideReference`, `presentGuideReference`, `isGuideReference` and
`GuideReference` go with it: a guide's screens ride the ordinary screen table. `openGuide(ns, player)`
is a `navigate()`, so it opens this bundle's guide or another addon's the same way. The views take
link keys (`linkTo`, `homeTo`) instead of open-page callbacks.

`@bedrock-core/ore-styled`: `Button` and `MenuRow` take `to`, and render a link instead of a plain
button when given one.

`@bedrock-core/config` resolves keys for the whole realm: it installs `provideReferences` over the
framework's own table and every addon's published one, publishes this addon's screens with
`core.register({ screens })`, and opens a guide by navigating to its index key.
