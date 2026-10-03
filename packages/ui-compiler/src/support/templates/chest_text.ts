import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_chest.text_host': (): TemplateDefinition => ({
    control: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [
        '100%c',
        '100%c',
      ],
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      collection_name: 'container_items',
      controls: [],
    },
  }),
} satisfies TemplateModule;
