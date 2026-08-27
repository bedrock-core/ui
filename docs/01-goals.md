# 01 — Goals

## Principles

1. **Build over runtime.** Anything the build can decide, the build decides. The runtime is fibers, one allocation walk, carrier writes and input reads. Layout is solved at build as the **base**; at runtime only the **islands** the analysis marked as layout-live are re-solved, inside boxes the build reserved ([03-ir](./03-ir.md#layout-the-base-and-the-islands)). Text is never measured at runtime: live text reserves its box. *Decided.*
2. **One component set.** The same JSX draws on every host. A component never knows how a value travels; it emits an element and, at most, says what it needs (a press, a slot). *Decided.*
3. **The host owns transport.** Items, strings, native fields — that knowledge lives in exactly one place per host, split into a build half (JSON UI emission) and a runtime half (write/read loops). Nothing above a host dispatches on which host it is; nothing below it dispatches on which component it came from. *Decided.*
4. **Frozen shape.** A compiled screen never adds, removes or reorders controls at runtime. Change is a value on a carrier; a subtree that comes and goes is `visible`; a list has a declared maximum. *Decided* — this is what lets one JSON UI file serve every player and every state.
5. **Measured rules.** Every JSON UI rule these pages rely on is either measured in game (recorded in [06-render-pack](./06-render-pack.md) or `docs/docs/ui/container-screens/findings.md` in the docs repo) or tagged *Measure*. Nothing is assumed from the wiki alone.

## What is worth baking — the cost model

"Should this be baked, carried, or left to the client" has one answer per host, from this table. The analysis in [03-ir](./03-ir.md) applies it; authors never choose a class.

| Class | Runtime cost | Who decides |
| --- | --- | --- |
| **Baked** | none — a literal in JSON UI | the default for every prop |
| **Local** | none on the server — the client keeps the state (a tab strip, an expander, a toggle nobody reads) | an interactive control whose state no handler reads and no live prop depends on |
| **Carried** | per host: a container slot per bool / int / character plus a poll fingerprint, or a form entry (one engine cell) per live cell plus per-present serialization | a prop whose value differs between renders (inferred), with a capacity the author declares where the carrier needs one |
| **Input** | a drawn slot + poll, or a form entry | a handler prop being present |
| **Native** | the engine owns the value while the screen is open (toggle, slider, text field, scroll offset) | a component that maps to a native control on that host |

Rules that follow:

- A prop is carried only when it **changes**; a handler is wired only when it is **present**. Everything else is baked, whatever it is.
- A control is **local** when it is interactive and unobserved. The moment a handler reads it or a live prop depends on it, it needs an input, and the host decides how.
- **Inference proposes; declaration decides capacity.** Liveness comes from real renders. A text length, a numeric range, an enum's members and a list's maximum are declared, because a wrong guess is a silent truncation. The build error that asks for a declaration prints the values it observed, so the author copies rather than guesses.
- Enum and limit inference is only worth doing on hosts whose carriers are numeric (the chest): a live string there has to become a number, and the observed set is the suggestion. On the form host strings are uncapped, so inferring an enum gains nothing.

## Non-goals

- Ore-UI / DDUI. Not JSON UI, not this library.
- Runtime re-layout. A compiled layout is final; content that must be sized at runtime (a foreign-language wrap) gets a client-sized box, never a server measurement.
- Static analysis of TypeScript. Liveness comes from rendering the real fibers, never from reading source.
- Keeping the byte-offset interpreter as a design target. It survives as a legacy host only until its three consumers move ([09-plan](./09-plan.md)).
