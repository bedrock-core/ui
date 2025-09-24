import { CoreUIFormData } from '.';

export interface Component {

  /**
   * Serialize the component into a format suitable for embedding into a ModalFormData
   * @param form - The ModalFormData instance to serialize into
   */
  serialize: (form: CoreUIFormData) => void;
}
