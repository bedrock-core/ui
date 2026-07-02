import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
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
    form.button('Button 1');
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
});
