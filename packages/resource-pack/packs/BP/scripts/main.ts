import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import {
  ActionFormData,
  CustomForm,
  ModalFormData,
  ObservableBoolean,
  ObservableNumber,
  ObservableString,
} from '@minecraft/server-ui';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { App } from './UI/App';

const isPlayer = (source: ButtonPushAfterEvent['source']): source is Player =>
  source.typeId === MinecraftEntityTypes.Player;

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (!isPlayer(source)) {
    return;
  }

  if (block.typeId === MinecraftBlockTypes.StoneButton) {
    render(App, source);
  }

  if (block.typeId === MinecraftBlockTypes.AcaciaButton) {
    // Acacia button → vanilla form
    const form = new ActionFormData();

    form.title('Vanilla Form');
    form.header('Test Header');
    form.button('Button 1');
    form.header('Test Header 2');
    form.button('Button 2');
    form.button('Button 3');

    form.show(source);
  }

  if (block.typeId === MinecraftBlockTypes.BirchButton) {
    // Birch button → vanilla modal form reference (one of each field type)
    const form = new ModalFormData();

    form.title('Vanilla Modal Form');
    form.textField('Text', 'type here', { defaultValue: '' });
    form.toggle('Toggle', { defaultValue: false });
    form.slider('Slider', 0, 10, { valueStep: 1, defaultValue: 5 });
    form.dropdown('Dropdown', ['Easy', 'Normal', 'Hard'], { defaultValueIndex: 1 });

    form.show(source).then((response) => {
      if (response.canceled || !response.formValues) {
        return;
      }

      const [text, toggle, slider, dropdown] = response.formValues;

      source.sendMessage(`§a[Vanilla Modal] text=§f${String(text)}§a toggle=§f${String(toggle)}§a slider=§f${String(slider)}§a dropdown=§f${String(dropdown)}`);
    });
  }

  if (block.typeId === MinecraftBlockTypes.WarpedButton) {
    // SPIKE — protocol v0008 groundwork: can a form label carry a RawMessage,
    // and does the client resolve translate+with BEFORE the JSON UI's text
    // binding reads it? Three probes, observed with the core-ui RP applied:
    //   1. plain translate+with in a label      → does %s fill?
    //   2. {text} prefix + translate rawtext    → does the RESOLVED concatenation
    //      arrive as one string? (the "fixed prefix + variable tail" layout the
    //      serializer would use to keep field offsets decodable)
    //   3. nested translate as a with-parameter → full client-side composition?
    // If all three paint correctly, the protocol can move the label text to a
    // variable tail and raw() paints keys + params with NO 80-byte cap.
    const form = new ActionFormData();

    form.title({ rawtext: [{ text: 'SPIKE ' }, { translate: 'multiplayer.player.joined', with: ['TITLE'] }] });
    form.label({ translate: 'multiplayer.player.joined', with: ['PROBE-1'] });
    form.label({ rawtext: [{ text: 'PREFIX_' }, { translate: 'multiplayer.player.joined', with: ['PROBE-2'] }] });
    form.label({
      rawtext: [{
        translate: 'multiplayer.player.joined',
        with: { rawtext: [{ translate: 'item.apple.name' }] },
      }],
    });
    form.button('OK');

    form.show(source);
  }

  if (block.typeId === MinecraftBlockTypes.CherryButton) {
    // Cherry button → vanilla CustomForm (DDUI): unlike ActionFormData/ModalFormData,
    // every control is backed by an Observable*, the form stays open while you interact
    // with it, and buttons live INSIDE the layout with their own onClick — no single
    // show().then(formValues) round trip.
    const name = new ObservableString('', { clientWritable: true });
    const subscribe = new ObservableBoolean(true, { clientWritable: true });
    const volume = new ObservableNumber(5, { clientWritable: true });
    const rankIndex = new ObservableNumber(0, { clientWritable: true });
    const ranks = ['Guest', 'Member', 'VIP', 'Admin'];

    // Server-side subscriptions: fire the moment the client edits a control,
    // no submit needed — this is the "reactive" half vanilla forms didn't have before.
    const unsubName = name.subscribe((value) => {
      source.sendMessage(`§7[live] name → §f${value}`);
    });
    const unsubVolume = volume.subscribe((value) => {
      source.sendMessage(`§7[live] volume → §f${value}`);
    });

    const form = new CustomForm(source, 'Vanilla CustomForm');

    form.header('Profile');
    form.textField('Name', name, { description: 'Shown to other players' });
    form.toggle('Subscribe to updates', subscribe);
    form.divider();

    form.header('Preferences');
    form.slider('Volume', volume, 0, 10, { step: 1 });
    form.dropdown(
      'Rank',
      rankIndex,
      ranks.map((label, value) => ({ label, value })),
    );
    form.spacer();

    // Buttons inside the layout (impossible in ModalFormData) — each gets its own
    // callback and can read the live observable values whenever it's pressed.
    form.button('Apply', () => {
      source.sendMessage(
        `§a[CustomForm] Apply → name=§f${name.getData()}§a subscribe=§f${String(subscribe.getData())}§a volume=§f${volume.getData()}§a rank=§f${ranks[rankIndex.getData()]}`,
      );
    });
    form.button(
      'Reset volume',
      () => {
        volume.setData(5);
      },
      { tooltip: 'Sets volume back to the default' },
    );
    form.closeButton();

    form.label('Reactive, better, but no personalization, no custom textures, and no layout control');

    form.show().then((closedReason) => {
      name.unsubscribe(unsubName);
      volume.unsubscribe(unsubVolume);
      source.sendMessage(`§7[CustomForm] closed: §f${closedReason}`);
    });
  }
});
