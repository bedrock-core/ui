# 05 — Components

One component set. A component is a function from props to a host element with a small, fixed prop surface; everything about transport is decided below it. Styled layers (`ore-styled`) keep composing the primitives exactly as today — `ore-styled/src/Button.ts` is the model: props in, primitive out, nothing else.

## Needs vs offers

Every IR node kind lists what it *may* need; every host lists what it *offers*. The build checks one against the other, per node, in context:

| Situation | Outcome |
| --- | --- |
| The node needs nothing (a baked panel, a baked label, an image) | draws on every host |
| The node needs an input the host offers (`Button onPress` on a form or a chest) | wired |
| The node needs an input the host lacks (`Slot` on a form; `Form.Input` on a chest) | **build error**: names the element, the host, and the nearest thing the host does offer |
| The node's carried prop needs a carrier the host lacks (a live `texture` on a chest with no `values={…}`) | **build error** with the observed values to declare |
| The node has a handler but the host cannot deliver it *there* (a live label inside a baked button face) | **build error** naming the position |
| The node is interactive and unobserved (`Tabs` with no handler) | local; costs nothing |

This one rule replaces `validateForm`, `validateContainer`, `FORM_ONLY_TYPES`, `CONTAINER_ONLY_TYPES` and the `Modal*` type lists. "All components at least visually, some not functional on some hosts" is exactly what falls out: a visual node has no needs; a functional one either finds its input or fails at build with the reason.

*Decided.*

## The event object — the 1.0 API change

Every handler receives one object. `player` is always present: the viewer on a player-owned screen, the actor on an entity-owned one. `host` is present only on entity-owned screens.

Shipped in phase 0 (`core/events.ts`). A screen an entity owns always has that entity, so those events narrow `host` from optional to required rather than declaring a second field:

```ts
interface UiEvent        { player: Player; host?: Entity }   // Form.onCancel
type      PressEvent   = UiEvent                             // Button.onPress
interface ContainerEvent extends UiEvent { host: Entity }    // Container.onOpen / onClose
interface SlotEvent      extends ContainerEvent { stack: ItemStack }  // Slot.onInsert / onRemove
interface SubmitEvent    extends UiEvent { values: FormValues }       // Form.onSubmit

interface ChangeEvent<T> extends UiEvent { value: T }        // Tabs.onChange — phase 5
```

Replaces `onPress(player?, host?)`, `onInsert(player, stack, host)`, `onSubmit(values)` and the rest. *Done* — it landed before 1.0 because it is breaking.

`useExit()` returns a handler value like any other; the IR recognises it as input `exit` and the host decides what a close is (the native close on a form, the client-side close button on a chest). The `containerExit` identity sentinel in `core/fabric/exit.ts` goes.

## The button, today and after

The look is the same on every host — one `button_face` in the vocabulary. Only the mechanism differs: a slot with a transport item on the chest, an entry with a baked index on a form ([03-ir, look vs mechanism](./03-ir.md#look-vs-mechanism)).

Today a button is spread over eleven places, each deciding something the others must agree with:

| Where | Decides |
| --- | --- |
| `components/Button.ts` | the element, the form writer, `isExitButton`, the container cell claim |
| `core/writers.ts` `emitButton` | button index bookkeeping, the modal refusal |
| `core/render/presenters/presentAction.ts` | selection → callback |
| `container/cells/button.ts` | transport / guard semantics of a press |
| `container/allocate.ts` `CLAIMS` | that a button takes a slot |
| `ui-compiler/nodes/button.ts` | faces, mappings, enabled gates, the transport aux literal |
| `ui-compiler/nodes/exit.ts` | the close button |
| `components/Form/FormButton.ts` | submit / exit riding the form title |
| `core/render/validateForm.ts`, `validateContainer.ts` | where a button may sit |
| `core/fabric/exit.ts` | the `useExit` sentinel |
| RP `button.json`, `button_router.json`, `state_face` | the per-cell decode of four faces |

After:

| Layer | Decides |
| --- | --- |
| `components/Button.ts` | `{ type: 'button', props: { faces, enabled, onPress?, children } }` — nothing else |
| IR `button` node | `enabled: Bound<boolean>`, `press?: Input`, baked faces, baked children |
| host `chest` | `press` = transport in a slot; `enabled` = transport vs guard aux (unchanged rules) |
| host `form-action` | `press` = one entry with a baked `collection_index`; `enabled` = one character in that entry |
| host `form-modal` | `press` refused; `submit` / `cancel` inputs accepted |
| RP vocabulary | one `button_face` shape with `$default / $hover / $pressed / $locked` textures |

Same JSX, one decision per layer, no layer repeating another's.

## Component-level changes this implies

- `Button`, `Text`, `Image`, `Panel`, `Scroll`, `Background`, `Slot`, `SlotGrid`, `Container`, `Form.*`: keep their public props; drop their writers, cell claims, `nativeArgs` side channels and `__textMetrics` payload contracts.
- `Text`: `maxLength` keeps its meaning (capacity + liveness marker). Localized text is a key resolved on the client with `localize: true` on every host; the server never measures a player's language.
- New: `List max`, `Tabs`, `Disclosure` (a header toggle folding the rows under it on the client; compiled-only like `Tabs`). `List` is required before the config screens can compile ([09-plan](./09-plan.md)).
- `registerComponent` / custom native components: the current contract is the byte protocol's. It is marked experimental at 1.0 and replaced by "register an IR node kind + a host emitter" in v2.
