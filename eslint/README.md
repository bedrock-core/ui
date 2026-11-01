# @bedrock-core hook linting

`@bedrock-core/ui/eslint` exports the `core-hooks` plugin and its recommended
flat-config preset. [Consumer setup](https://bedrock-core.drav.dev/docs/ui/guides/linting)
covers installation and addon configuration. The workspace enables the same checks as
errors in every TypeScript library. `eslint-plugin-react-hooks` is pinned to
7.1.1 for upstream code-path and compiler analysis. No React runtime is installed.

The coverage table accounts for every rule in the
[React Hooks recommended documentation](https://react.dev/reference/eslint-plugin-react-hooks).
`ruleCoverage` records the same decisions in executable form; regression tests
require coverage of the pinned upstream preset plus `component-hook-factories`.

| Rule | Core coverage |
| --- | --- |
| `rules-of-hooks` | Upstream hook ordering, loops, early returns, async and call-site checks, extended to renamed and namespace Core imports. |
| `exhaustive-deps` | Core effect captures, explicit dependency arrays and stable runtime handles. |
| `component-hook-factories` | Custom hooks and component/context factories must be prepared outside render; module-level Core factories remain valid. |
| `static-components` | Upstream checks for component definitions recreated while rendering. |
| `globals` | Shared assignments, deletion, collection mutations, local aliases and immediate array callbacks during render. |
| `immutability` | Upstream props/state checks, plus collection mutations on props and state, including aliases and event callbacks. |
| `purity` | Upstream impure-call checks during render, retaining valid effects, events and lazy initializers. |
| `set-state-in-render` | Upstream unconditional-update checks with Core state contracts. |
| `set-state-in-effect` | Upstream synchronous effect-update checks with Core state/effect contracts. |
| `error-boundaries` | Child JSX construction does not execute a child; diagnostics point to Core render transactions or host operations for error handling. |
| `refs` | Excluded: Core supports render-time ref reads and latest-value writes. |
| `config` | Excluded: Core has its own compiler configuration. |
| `gating` | Excluded: React Compiler gating does not control Core execution. |
| `incompatible-library` | Excluded: React's memoization compatibility list does not govern Core. |
| `preserve-manual-memoization` | Excluded: Core has no `useMemo`, `useCallback` or React memo pass. |
| `unsupported-syntax` | Excluded: React Compiler syntax limits do not describe Core's compiler. |
| `use-memo` | Excluded: Core does not export `useMemo`. |

## Runtime contracts

Core allocates ordered hook slots on the active fiber. Components use PascalCase
names and custom hooks use `use` followed by a capital letter. Keep hook calls in
a fixed order. Framework code with a stronger lifetime invariant uses a narrow
ESLint suppression that explains the invariant.

Dependency checking applies to explicit `useEffect` arrays. It checks inline
callbacks and local functions; a callback supplied by a caller must itself be a
dependency. Arrays must contain identifiers or static property paths without
spreads. Omitting dependencies runs the effect after every render and needs no
capture list. Named imports, import aliases, namespace imports and the runtime's
internal hook entry points are resolved by binding rather than spelling alone.

`useRef` and `useRenderOwner` return stable handles. State setters and reducer
dispatch functions are recreated by Core, so dependency checks require them.
`useEvent` already includes its signal, callback and options in subscription
dependencies; its optional array adds triggers. `useFocusEffect` tracks callback
identity and has no authored dependency array.

Core's component identity uses owner, function name, key and parent path. Its
compiled metadata also keys records by function reference. Preparing components
and factories outside render keeps both contracts explicit; React's identity
and memoization implementation are not assumptions of this preset.

## Analysis boundaries

The compiler adapter gives imported Core `useState`, `useReducer`, `useEffect`,
`useRef` and `useContext` calls synthetic contracts in an analysis-only source
view. This handles aliases, namespaces and short internal import paths without
changing the file or ESLint AST. It analyzes PascalCase components and `use`
hooks, including functions that construct elements without JSX. Source positions
map back using UTF-16 offsets; diagnostics omit synthetic-source code frames and
automatic edits. State-update diagnostics give reducer dispatch the same update
contract as a setter: both commit a slot and schedule the owning session in Core.

These checks are static diagnostics rather than proof of runtime behavior or
full React Compiler parity. Dynamic property access, hook re-exports through
unregistered modules, arbitrary factory indirection and helper-mediated side
effects can escape analysis. Shared-mutation checks follow lexical bindings and
known collection methods; they do not infer arbitrary method implementations.
Compiler-backed checks retain upstream analysis limits and bailouts.

## Verification

Run `yarn test:lint` for valid/invalid rule cases, Core contract differences,
import normalization, diagnostic positions, workspace configuration and packed
consumer acceptance. Package acceptance checks archive contents, public exports,
tooling peers, lint diagnostics and TypeScript declarations from an isolated
consumer using only the declared tooling and runtime dependencies. The release
checks run this suite. Run `yarn lint:libs` to check library sources.
