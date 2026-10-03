import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_common.unused': (): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [0, 0],
    },
  }),
} satisfies TemplateModule;
