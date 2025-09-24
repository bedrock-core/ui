import { ModalFormData } from '@minecraft/server-ui';

export * from './component';
export * from './serialization';

// For now we will only be supporting ModalFormData, in future depending on requirements
// we might add support for other form types
export type CoreUIFormData = ModalFormData;
