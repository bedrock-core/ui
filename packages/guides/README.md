# @bedrock-core/guides

Docusaurus-style **in-game guides** for `@bedrock-core/ui`: author MDX, compile it at build time
with the [`guides` regolith filter](https://github.com/bedrock-core/regolith-filters), render it
as server forms with this package.

```
packs/data/guide/<locale>/**.mdx
      │  guides regolith filter
      ├─→ RP/texts/<locale>.lang            (auto-localized prose — client resolves per player language)
      └─→ @bedrock-core/generated/guides    (guide IR manifest: sidebar tree, pages, prev/next)
                │
                ▼  this package
      GuideContents / GuidePage screens
```

## Standalone

```tsx
import guides from '@bedrock-core/generated/guides';
import translationKeys from '@bedrock-core/generated/translation-keys';
import { GuideApp } from '@bedrock-core/guides';
import { render } from '@bedrock-core/ui';

render(<GuideApp manifest={guides} translationKeys={translationKeys} />, player);
```

## Embedded in an existing navigator

```tsx
import { createGuideScreens, staticGuideSource, type GuideRoutes } from '@bedrock-core/guides';

type AppRoutes = {
  Home: undefined;
} & GuideRoutes;

const Stack = createStackNavigator<AppRoutes>({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    ...createGuideScreens<AppRoutes>(staticGuideSource(guides)),
  },
});

// anywhere: navigation.navigate('GuideContents');
```

## What renders how

| IR block | Renders as |
| --- | --- |
| headings | `Text` (`minecraftTen` for h1, scaled `mojangles` below) |
| paragraphs | wrapping localized `Text` + a row of link buttons for internal links |
| lists | bullet/numbered rows, one nesting level indented |
| images | `Image` at full width with compile-time-sniffed aspect ratio |
| admonitions | dark `Card` with a colored, localized title |
| code | dark `Card` of raw `§7` lines (pre-wrapped by the filter) |
| `<Component />` | looked up in the `components` registry passed via options; placeholder otherwise |

All prose renders through `localizationKey` — text is resolved client-side per player language
and wraps natively. Text *measurement* (ellipsis/`maxLines`) uses the host's
`TranslationKeysContext` (default-locale strings); run the filter **before** `translation-keys`
so guide keys are in the metrics map.

## API

- `GuideApp({ manifest, initialPageId?, title?, components?, translationKeys? })` — standalone app
  owning its `NavigationContainer`; `initialPageId` deep-links with contents beneath it.
- `createGuideScreens<TRoutes>(source, { title?, components? })` — the two screens for a host stack.
- `staticGuideSource(manifest)` — wraps the build-time manifest as a `GuideSource`.
- `GuideSource.getPage` (optional) — async page fetch hook for cross-addon sources; the page
  screen shows a loading state while it settles.
- `GuideBlockList({ blocks, ns, onNavigate?, components? })` — the raw IR renderer, exported for
  custom layouts.
