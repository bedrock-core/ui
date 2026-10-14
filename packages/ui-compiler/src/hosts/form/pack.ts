import type { Control } from '../../jsonui';
import { createSupportLinker, type UiSupport } from '../../support/link';
import type { CompiledFormScreen } from './compile';
import { formRouter, type FormRouting } from './router';

export interface CompiledFormPack extends FormRouting {
  /** Linked screens; write their documents and merge their shared faces. */
  screens: CompiledFormScreen[];
  /** The complete set of compiler helpers needed by these screens and their router. */
  support: UiSupport;
}

/** Collection data and view sources can arrive after a factory creates its cell. */
const initializeFactoryBindings = (value: unknown): void => {
  if (value === null || typeof value !== 'object') { return; }

  if ('binding_type' in value && (value.binding_type === 'collection' || value.binding_type === 'view')
    && (!('binding_condition' in value) || value.binding_condition === undefined)) {
    Object.assign(value, { binding_condition: 'always' });
  }

  Object.values(value).forEach(initializeFactoryBindings);
};

/** Finalizes an addon's form UI without a dependency on UI JSON in another pack. */
export function buildFormPack(screens: readonly CompiledFormScreen[], addon: string): CompiledFormPack {
  if (screens.some(screen => screen.addon !== addon)) { throw new Error('A form pack must contain screens from one addon namespace.'); }

  const linker = createSupportLinker(addon);
  const linked = screens.map(screen => ({
    ...screen,
    document: linker.link(screen.document),
    faces: linker.link<Record<string, Control>>(screen.faces),
    ...screen.testMetadata === undefined
      ? {}
      : {
          testMetadata: {
            ...screen.testMetadata,
            controls: screen.testMetadata.controls.map(control => ({ ...control, paths: control.paths.map(linker.path) })),
          },
        },
  }));
  const routing = formRouter(screens, addon);
  const router = linker.link(routing.router);
  const support = linker.support();

  [router, support.document, ...linked.flatMap(screen => [screen.document, screen.faces])].forEach(initializeFactoryBindings);

  return {
    ...routing,
    router,
    screens: linked,
    support,
  };
}
