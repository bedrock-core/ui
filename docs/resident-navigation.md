# Static navigation

`@bedrock-core/navigation` defines static stacks and top tabs. `createStaticNavigation()` composes one complete tree inside the author's action-form `Screen`. Local pages, published aliases, hooks, links and player-scoped refs use the same tree.

## Ownership

| Package | Owns |
| --- | --- |
| `@bedrock-core/ui-runtime` | Controls, expansion, layout data, render owners and lifecycle notifications |
| `@bedrock-core/ui-compiler` | Generic selection masks and native input emission |
| `@bedrock-core/navigation` | Route definitions, state reducers, context planning, checkpointing, refs and Back policy |
| `@bedrock-core/navigation/runtime` | Custom factories using the shared stack/tab routers, pure navigator layouts and destination host support |
| `@bedrock-core/navigation/core` | Core discovery, host registration and cross-addon transport |

The main UI entry point retains `render()`. Navigation does not own another renderer or native host.

The public navigation entry exposes route APIs and whole-host `navigate`, `navigateAsync`, `back` and `closeUi`. The runtime extension exposes `createNavigatorFactory`, `currentLocation`, `checkpoint`, `setNavigator`, `openScreen` and `renderDestination`. History mutation, transfer snapshots and compiled-reference interpretation remain implementation details.

## Static tree

`createStackNavigator({ screens })` records visited routes. `createTopTabNavigator({ screens })` selects peer tabs above their content. A nested navigator is a screen source, with its logical state retained in the parent route.

`Link` and intact `useLinkProps()` handlers carry readable action descriptions. Imperative hook methods and ordinary callbacks execute on the server. Published keys and `createScreenReference()` destinations always use a server handoff.

The default shared budget is five additional stack entries or tab visits and 128 native contexts for the entire tree. Replacing sibling pages does not increase history depth; the planner prepares those paths before deeper link histories. Each route/literal-parameter body mounts once. Small contextual inputs select the correct logical history. The context budget does not limit registered route names; mounted body count still affects cost.

## Planning and confirmation

The compiled snapshot stores one finite context graph and its page identities. Application contexts replay declarative actions over the current server-confirmed tree. Recent reading contexts restore their bounded history snapshots. Carried masks enable only contexts that match actual parameters, availability and server-navigation policy.

Context zero represents the confirmed entry. A server boundary confirms the selected recipe, updates logical state and refreshes the existing render session. The next presentation starts another bounded native window. It preserves mounted hook fibers within that session.

Before an ordinary server handler runs, its contextual input confirms the active route and history. Before a published handoff, the controller checkpoints the full logical tree under `location.navigatorStates[rootId]`. Returning to that host restores the tree; private hook state is rebuilt after a host change.

Server reads and listeners describe confirmed state. Native selection does not execute JavaScript or replay intermediate focus events. Focus hooks and preventable events require explicit server-navigation policy on the screen, an ancestor, or the root.

## Generic renderer integration

`TreeBoundary` lets a library transform fully expanded children before layout. `withCompileData()` stores portable library data in a compiled snapshot; `useCompiledData()` retrieves it at runtime. `useRenderOwner()` identifies build, player or entity ownership.

`refreshRender(player)` closes and re-presents the current form while retaining fibers. Its session-scoped pending flag prevents a refresh response from being handled as cancellation, and stale queued refreshes cannot close a replacement session.

`observeRenderLifecycle()` emits immutable server session notifications. Navigation applies its own destination and history policy to these facts. A session start acknowledges server initialization without acknowledging native client paint.

## Native selection

Each context owns a passive radio input. One always-mounted source combines `#toggle_state` from its owner and incoming navigation controls. Page and input gates share that source. Read each input's own state: controls sharing a forced radio index do not provide a reliable mirrored state on passive peers.

The owner stays outside page gates at zero size with focus and button mappings disabled. Context gates use fixed overlay geometry. Native button faces fill both axes and supply every on/off, hover and locked state.

Form-carried visibility and membership values use data-only sources in always-mounted zero-area helper groups outside page gates. These groups bound sibling counts without changing source identities or collection hosts. Rendered controls read those sources through view bindings. Native radio inputs retain one shared collection scope across pages and conditional visibility gates.

A carried text mask selects a subset of a fixed index universe. Runtime masks may change membership while the compiled indexes remain stable. Shared caption frames keep labels outside the repeated contextual hitboxes.

## Guides

Generated guides use the same static stack. Each audience owns a filtered route tree, with pages under `page:<id>` and a separate `index` route. MDX components use `Link`, `useLinkProps()` and the standard navigation hooks. Ordinary button handlers receive the confirmed state before they run.

Guides use flat recent history: repeated page names collapse loops and at most five Back destinations are retained. Older visits are discarded. Their complete bounded graph is compiled across all entry pages; budget exhaustion is a build error. Absolute history contexts and entry masks keep reading local after explicit server actions. A compiled entry supplies the initial route only when no confirmed navigator state exists.
