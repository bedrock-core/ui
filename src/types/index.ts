import { ModalFormData } from '@minecraft/server-ui';
import { Component } from './json_ui/components';

export type * from './json_ui/components';
export type * from './json_ui/properties';

export type Functional<T extends Component> = T & {
  serialize: (form: FormData) => string;
}

// TODO TEMPORAL FOR TESTING
// export type FormData = ActionFormData | ModalFormData | MessageFormData;
export type FormData = ModalFormData;