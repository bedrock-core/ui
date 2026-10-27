import type { Player } from '@minecraft/server';
import * as nativeUI from '@minecraft/server-ui';
import { isHandler, type PressEvent, type UiEvent } from '../../core/events';
import { playerOwner } from '../../core/fabric';
import { getSessionRoot, isSwapPending } from '../../core/render/session';
import { compiledScreens } from '../../core/render/screens';
import { runInteractiveCallback, type PresentResult } from '../../core/render/present';
import type { JSX } from '../../jsx';
import { oreStateFrame, ORE_FRAME_PARTS, ORE_ACTION_PREFIX, ORE_INPUT_PREFIX, ORE_TEXT_PREFIX, oreElements, oreValues, type OreLayout } from './contract';
import { oreMessage, validOreInput, type OreInput } from './fields';

interface Binding {
  root: JSX.Element | undefined;
  screen: string;
  ids: string[];
  publish(tree: JSX.Element): void;
  act(id?: string): Promise<void>;
  receive(packet: string): Promise<void>;
  change(id: string, value: unknown): Promise<void>;
  finish(error?: unknown): void;
}
interface NativeButton {
  label: nativeUI.ObservableString;
  localized?: nativeUI.ObservableUIRawMessage;
  disabled: nativeUI.ObservableBoolean;
  visible: nativeUI.ObservableBoolean;
}
interface Bank {
  buttons: NativeButton[];
  ready: nativeUI.ObservableString;
  dismiss: nativeUI.ObservableString;
  readyVisible: nativeUI.ObservableBoolean;
  binding?: Binding;
  input?: { label: nativeUI.ObservableString; value: nativeUI.ObservableString; visible: nativeUI.ObservableBoolean; dispose(): void };
}
interface Transport {
  id: number;
  player: Player;
  form: nativeUI.CustomForm;
  title: nativeUI.ObservableString;
  carrier: nativeUI.ObservableString;
  parts: { text: nativeUI.ObservableString; visible: nativeUI.ObservableBoolean }[];
  labels: { text: nativeUI.ObservableString; visible: nativeUI.ObservableBoolean }[];
  localized: { text: nativeUI.ObservableUIRawMessage; visible: nativeUI.ObservableBoolean }[];
  banks: Bank[];
  nextBank: number;
  started: boolean;
  disposed?: boolean;
  binding?: Binding;
}
const live = new Map<string, Transport>();
let nextIdentity = Date.now();

/** Closes the native backing form and releases its current logical destination. */
export function closeExperimentalOre(player: Player): void {
  const transport = live.get(player.id);

  if (!transport) { return; }

  try { if (transport.form.isShowing()) { transport.form.close(); } } finally { dispose(transport); }
}

/** Releases one logical destination while retaining the player's native Ore form. */
export function handoffExperimentalOre(player: Player, layout: OreLayout): boolean {
  const transport = live.get(player.id);

  if (!transport?.form.isShowing() || !fits(transport, layout)) { return false; }

  transport.binding?.finish();

  return true;
}

/** Publishes a background hooks pass into the existing DDUI instance. */
export function updateExperimentalOre(player: Player, tree: JSX.Element): void {
  const binding = live.get(player.id)?.binding;

  if (binding?.root === getSessionRoot(playerOwner(player))) {
    try { binding?.publish(tree); } catch (error) { closeExperimentalOre(player); throw error; }
  }
}

function dispose(transport: Transport, error?: unknown): void {
  if (transport.disposed) { return; }

  transport.disposed = true;

  for (const bank of transport.banks) {
    bank.input?.dispose();
  }

  if (live.get(transport.player.id) === transport) { live.delete(transport.player.id); }

  transport.binding?.finish(error);
}

function update<T>(observable: { getData(): T; setData(value: T): void }, value: T): void {
  if (observable.getData() !== value) { observable.setData(value); }
}

function capacity(layout: OreLayout): { labels: number; buttons: number } {
  return {
    labels: layout.nodes.filter(node => node.kind === 'text' && node.localize).length,
    buttons: layout.nodes.filter(node => node.kind === 'button').length,
  };
}

function fits(transport: Transport, layout: OreLayout): boolean {
  const required = capacity(layout);

  return required.labels <= transport.labels.length && required.buttons <= transport.banks[0].buttons.length
    && (!layout.nodes.some(node => node.field) || transport.banks.every(bank => bank.input !== undefined));
}

function createTransport(player: Player, initial: OreLayout): Transport {
  // Namespace lookup keeps new native exports out of imports used by older hosts.
  const CustomForm = Reflect.get(nativeUI, 'CustomForm');
  const ObservableString = Reflect.get(nativeUI, 'ObservableString');
  const ObservableBoolean = Reflect.get(nativeUI, 'ObservableBoolean');

  if (!CustomForm || !ObservableString || !ObservableBoolean) { throw new Error('Experimental_OreUI requires @minecraft/server-ui 2.2.'); }

  const title = new ObservableString('');
  const carrier = new ObservableString('');
  const form = new CustomForm(player, title);
  const transport: Transport = { id: ++nextIdentity, player, form, title, carrier, parts: [], labels: [], localized: [], banks: [], nextBank: 0, started: false };
  const layouts = [initial, ...compiledScreens().flatMap(screen => screen.snapshot?.ore === undefined ? [] : [screen.snapshot.ore])];
  const translatedSlots = new Set<number>();

  for (const layout of layouts) {
    const translated = new Set(layout.nodes.filter(node => node.localize && node.button).map(node => node.button));

    layout.nodes.filter(node => node.kind === 'button').forEach((node, index) => { if (translated.has(node.id)) { translatedSlots.add(index); } });
  }

  const required = layouts.map(capacity);
  const labelCount = Math.max(...required.map(value => value.labels));
  const buttonCount = Math.max(...required.map(value => value.buttons));
  const hasLocalized = layouts.some(layout => layout.nodes.some(node => node.localize));
  const hasFields = layouts.some(layout => layout.nodes.some(node => node.field));

  for (let index = 0; index < labelCount; index++) {
    const label = { text: new ObservableString(''), visible: new ObservableBoolean(false) };

    transport.labels.push(label);
    form.label(label.text, { visible: label.visible });

    if (hasLocalized) {
      const localized = { text: new nativeUI.ObservableUIRawMessage({ text: '' }), visible: new ObservableBoolean(false) };

      transport.localized.push(localized);
      form.label(localized.text, { visible: localized.visible });
    }
  }

  // Alternate action banks so a queued event from the outgoing bank cannot
  // dispatch into the immediately succeeding logical destination.
  for (let index = 0; index < 2; index++) {
    const bank: Bank = { buttons: [], ready: new ObservableString(''), dismiss: new ObservableString(''), readyVisible: new ObservableBoolean(false) };

    transport.banks.push(bank);

    const invoke = (id?: string): void => {
      const binding = bank.binding;

      if (!binding || transport.binding !== binding) { return; }

      void binding.act(id).catch((error: unknown) => {
        console.warn('[ui] Experimental Ore action failed: ' + String(error));

        if (live.get(player.id) === transport && transport.binding === binding) { closeExperimentalOre(player); }
      });
    };

    for (let slot = 0; slot < buttonCount; slot++) {
      const button = { label: new ObservableString(''), disabled: new ObservableBoolean(true), visible: new ObservableBoolean(false) };
      const translated = translatedSlots.has(slot);
      const localized = translated ? new nativeUI.ObservableUIRawMessage({ text: '' }) : undefined;

      bank.buttons.push({ ...button, localized });
      form.button(localized ?? button.label, () => {
        const id = bank.binding?.ids[slot];

        if (id !== undefined) { invoke(id); }
      }, { disabled: button.disabled, visible: button.visible });
    }

    form.button(bank.ready, () => invoke(), { visible: bank.readyVisible });
    form.button(bank.dismiss, () => {
      if (bank.binding && transport.binding === bank.binding) { closeExperimentalOre(player); }
    }, { visible: bank.readyVisible });

    if (hasFields) {
      const input = bank.input = { label: new ObservableString(''), value: new ObservableString('', { clientWritable: true }), visible: new ObservableBoolean(false), dispose: (): void => {} };

      form.textField(input.label, input.value, { visible: input.visible });
      const listener = input.value.subscribe((packet: string) => {
        const binding = bank.binding;

        if (binding && transport.binding === binding) { void binding.receive(packet).catch(error => console.warn('[ui] Ore field update failed: ' + String(error))); }
      });

      input.dispose = (): void => { input.value.unsubscribe(listener); };
    }
  }

  form.closeButton();

  for (let index = 0; index < ORE_FRAME_PARTS; index++) {
    const part = { text: new ObservableString(''), visible: new ObservableBoolean(false) };

    transport.parts.push(part); form.label(part.text, { visible: part.visible });
  }

  form.label(carrier);
  live.set(player.id, transport);

  return transport;
}

/** Presents a logical destination through one persistent, preallocated native form. */
export async function presentExperimentalOre(
  player: Player, tree: JSX.Element, layout: OreLayout, rebuild: () => JSX.Element,
): Promise<PresentResult> {
  const existing = live.get(player.id);

  if (existing && (!existing.form.isShowing() || !fits(existing, layout))) { closeExperimentalOre(player); }

  const transport = live.get(player.id) ?? createTransport(player, layout);
  const owner = playerOwner(player);
  const sessionId = ++nextIdentity;
  const bank = transport.banks[transport.nextBank];

  transport.nextBank = (transport.nextBank + 1) % transport.banks.length;
  let current = tree;
  let revision = 0;
  let ack = 0;
  let active = true;
  let busy = false;
  let sequence = 0;
  let inputError: string | undefined;
  const hasFields = layout.nodes.some(node => node.field);
  const nodesById = new Map(layout.nodes.map(node => [node.id, node]));
  const buttons = layout.nodes.filter(node => node.kind === 'button');
  const labels = layout.nodes.filter(node => node.kind === 'text' && node.localize);
  const queuedChanges = new Map<string, unknown>();
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const completed = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  const binding: Binding = {
    root: getSessionRoot(owner), screen: layout.screen, ids: [], publish, act, receive, change,
    finish: (error?: unknown): void => {
      if (!active) { return; }

      active = false;

      if (error === undefined) { resolve(); } else { reject(error); }
    },
  };

  function owns(): boolean {
    return active && live.get(player.id) === transport && transport.binding === binding
      && getSessionRoot(owner) === binding.root && !isSwapPending(owner);
  }

  function publish(next: JSX.Element): void {
    if (!owns()) { return; }

    const values = oreValues(next, layout);
    const entries = oreElements(next);
    const valuesById = new Map(values.map(value => [value.id, value]));
    const entriesById = new Map(entries.map(entry => [entry.id, entry]));
    const captions = new Map<string, typeof entries>();

    for (const entry of entries) {
      const node = nodesById.get(entry.id);

      if (node?.kind === 'text' && node.button) { captions.set(node.button, [...captions.get(node.button) ?? [], entry]); }
    }

    const encoded = oreStateFrame({
      schema: 'core-ore-state/1', screen: layout.screen, session: sessionId, transport: transport.id,
      revision: revision + 1, ack, asset: layout.asset, title: layout.title, values, ...inputError ? { error: inputError } : {},
    }, layout);

    current = next;
    revision++;
    binding.ids = buttons.map(node => node.id);
    update(transport.title, layout.title);

    for (const allocated of transport.banks) {
      const selected = allocated === bank;

      update(allocated.readyVisible, selected);

      if (allocated.input) {
        update(allocated.input.visible, selected && hasFields);

        if (selected) { update(allocated.input.label, ORE_INPUT_PREFIX + sessionId + ' | Change field'); }
      }

      if (selected) {
        update(allocated.ready, ORE_ACTION_PREFIX + sessionId + ':ready | Enable custom view');
        update(allocated.dismiss, ORE_ACTION_PREFIX + sessionId + ':dismiss | Close experimental screen');
      }

      allocated.buttons.forEach((button, index) => {
        const value = selected && buttons[index] ? valuesById.get(buttons[index].id) : undefined;

        update(button.visible, value?.visible === true);
        update(button.disabled, value === undefined || !value.enabled || !value.visible);

        if (value) {
          const prefix = ORE_ACTION_PREFIX + sessionId + ':' + value.id + ' | ';

          update(button.label, prefix + value.text);

          if (button.localized) {
            const parts = captions.get(value.id) ?? [];
            const message = { rawtext: [{ text: prefix }, ...parts.length ? parts.map(entry => oreMessage(entry.element, nodesById.get(entry.id)?.translationKey)) : [{ text: value.text }]] };

            if (JSON.stringify(button.localized.getData()) !== JSON.stringify(message)) { button.localized.setData(message); }
          }
        }
      });
    }

    transport.labels.forEach((label, index) => {
      const value = labels[index] ? valuesById.get(labels[index].id) : undefined;

      update(label.visible, value?.visible === true && !labels[index]?.localize);
      update(label.text, value?.text ?? '');
      const localized = transport.localized[index];

      if (localized) {
        const node = labels[index], entry = node && entriesById.get(node.id);

        update(localized.visible, !!value?.visible && !!node?.localize);

        if (entry) {
          const message = { rawtext: [{ text: ORE_TEXT_PREFIX + sessionId + ':' + node.id + ' | ' }, oreMessage(entry.element, node.translationKey)] };

          if (JSON.stringify(localized.text.getData()) !== JSON.stringify(message)) { localized.text.setData(message); }
        }
      }
    });
    transport.parts.forEach((part, index) => {
      update(part.text, encoded.parts[index] ?? ''); update(part.visible, index < encoded.parts.length);
    });
    transport.carrier.setData(encoded.carrier);
  }

  async function act(id?: string): Promise<void> {
    if (!owns() || busy) { return; }

    if (id === undefined) {
      ack++; publish(current);

      return;
    }

    const element = oreElements(current).find(entry => entry.id === id)?.element;
    const handler = element?.props.onPress;
    const value = oreValues(current, layout).find(value => value.id === id);

    if (!element || !value?.visible || !value.enabled || !isHandler<(event: PressEvent) => unknown>(handler)) { return; }

    busy = true;

    try {
      const outcome = await runInteractiveCallback(player, () => handler({ player }));

      if (!owns()) { return; }

      if (outcome === 'cleanup') {
        closeExperimentalOre(player);

        return;
      }

      ack++;
      busy = false;
      publish(rebuild());
    } catch (error) {
      console.warn('[ui] Experimental Ore callback failed: ' + String(error));

      if (owns()) { closeExperimentalOre(player); }
    } finally { busy = false; drainChanges(); }
  }

  function drainChanges(): void {
    if (!owns() || busy || !queuedChanges.size) { return; }

    const [id, value] = queuedChanges.entries().next().value!;

    queuedChanges.delete(id);
    void change(id, value).catch(error => console.warn('[ui] Ore field update failed: ' + String(error)));
  }

  async function change(id: string, input: unknown): Promise<void> {
    if (!owns()) { return; }

    const node = layout.nodes.find(node => node.id === id), value = oreValues(current, layout).find(value => value.id === id);

    if (!node?.field) { return; }

    if (busy) {
      queuedChanges.set(id, input);

      return;
    }

    const element = oreElements(current).find(entry => entry.id === id)?.element;
    const handler = element?.nativeArgs?.onChange;

    if (!value?.visible || !value.enabled || !isHandler<(input: OreInput, event: UiEvent) => unknown>(handler)) {
      ack++; publish(current);

      return;
    }

    busy = true;

    try {
      if (!validOreInput(node.field, input)) { throw new Error('Invalid value for ' + node.field.label + '.'); }

      const state = oreValues(current, layout);

      oreStateFrame({ schema: 'core-ore-state/1', screen: layout.screen, session: sessionId, transport: transport.id,
        revision: revision + 1, ack: ack + 1, asset: layout.asset, title: layout.title, error: ' '.repeat(160),
        values: state.map(value => value.id === id ? { ...value, input } : value) }, layout);
      inputError = undefined;
      const next = node.field.kind === 'dropdown' ? node.field.options![Number(input)].value : input;
      const outcome = input === value.input ? 'present' : await runInteractiveCallback(player, () => handler(next, { player }));

      if (!owns()) { return; }

      if (outcome === 'cleanup') {
        closeExperimentalOre(player);

        return;
      }

      ack++; busy = false; publish(rebuild());
    } catch (error) {
      if (owns()) {
        inputError = String(error instanceof Error ? error.message : error).slice(0, 160); ack++; busy = false; publish(current);
      }
    } finally { busy = false; drainChanges(); }
  }

  async function receive(text: string): Promise<void> {
    if (!owns() || text.length > 5000) { return; }

    let packet: unknown;

    try { packet = JSON.parse(text); } catch { return; }

    if (typeof packet !== 'object' || packet === null || !('session' in packet) || packet.session !== sessionId
      || !('sequence' in packet) || typeof packet.sequence !== 'number' || !Number.isSafeInteger(packet.sequence) || packet.sequence <= sequence
      || !('id' in packet) || typeof packet.id !== 'string' || !('value' in packet)) { return; }

    sequence = packet.sequence;
    await change(packet.id, packet.value);
  }

  transport.binding = binding;
  bank.binding = binding;

  try {
    publish(tree);

    if (!transport.started) {
      transport.started = true;
      void transport.form.show().then(() => dispose(transport), (error: unknown) => dispose(transport, error));
    }

    await completed;

    return 'cleanup';
  } catch (error) {
    if (live.get(player.id) === transport && transport.binding === binding) { closeExperimentalOre(player); }

    throw error;
  } finally {
    active = false;

    if (transport.binding === binding) { transport.binding = undefined; }

    if (bank.binding === binding) { bank.binding = undefined; }
  }
}
