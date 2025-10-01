import { CoreUIFormData } from '.';

export interface SerializableElement {

  /**
   * Serialize the element into a format suitable for embedding into a ModalFormData
   * @param form - The ModalFormData instance to embed elements into
   */
  serialize: (form: CoreUIFormData) => void;
}

export type IntrinsicElementFunction = (props: Record<string, unknown> & { children?: SerializableElement[] }) => SerializableElement;

export interface JSXProps {
  children?: SerializableElement[];
  [key: string]: unknown;
}

export type JSXComponentFunction<P extends JSXProps = JSXProps> = (props: P) => SerializableElement;

export type PropType = Record<string, unknown>;

export type ComponentType<P extends JSXProps = JSXProps> = string | JSXComponentFunction<P>;
