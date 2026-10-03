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

  return {
    ...routing,
    router: linker.link(routing.router),
    screens: linked,
    support: linker.support(),
  };
}
