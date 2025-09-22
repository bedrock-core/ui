import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import { Component } from './json_ui/components';

export type * from './json_ui/properties';
export type * from './json_ui/components';

export type Functional<T extends Component> = T & {
  serialize: (form: FormData) => string;
}

export type FormData = ActionFormData | ModalFormData | MessageFormData;