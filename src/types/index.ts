import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';

export type * from './json_ui/properties';
export type * from './json_ui/components';
export type * from './serialization';

export * from './serialization';

export type FormData = ActionFormData | ModalFormData | MessageFormData;