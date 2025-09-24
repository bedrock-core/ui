import { ModalFormData } from '@minecraft/server-ui';

export type * from './json_ui/components';
export type * from './json_ui/properties';

export interface Serialized {
  type: string;
  [key: string]: unknown;
}

export type SerializableComponent = { serialize: (form: FormData) => Serialized };

// TODO TEMPORAL FOR TESTING
// export type FormData = ActionFormData | ModalFormData | MessageFormData;
export type FormData = ModalFormData;
