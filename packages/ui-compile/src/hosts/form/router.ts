import { ContainerScreenError, formTitleFor } from '@bedrock-core/ui-runtime/compile';
import { SCREEN_DEFINITION, BACKDROP_DEFINITION } from '../../emit';
import type { Control, ControlEntry, Document } from '../../jsonui';

/**
 * How an addon's compiled screens reach the mount.
 *
 * One gated host per screen, gathered under the addon's own root, and one
 * modification putting that root into the library's mount. The shape mirrors
 * the chest's router exactly — and so does the reason for every part of it.
 *
 *  - The addon's root and every definition under it carry the ADDON's name, so
 *    two addons' routers never overwrite each other in one world.
 *  - The hook is a copy of the mount's own path holding one `modifications`
 *    entry and defining nothing, because modifications resolve per file path
 *    and stack across packs in pack order. A definition there would replace
 *    every other pack's instead of joining them.
 *  - Each screen gates on its FULL title, which is the encoding and the
 *    screen's namespaced name. Two screens can never both match, because a
 *    title names exactly one.
 *
 * What the chest needs and this does not: no sentinel, no key folded into two
 * stack sizes, no entity. A title is a string, so a screen is named outright.
 */

/** Where the library's mount lives. An addon ships this same path to insert into it. */
export const MOUNT_FILE = 'ui/core-ui/form/mount.json';

/** The namespace of that file, and of every addon's router. */
export const MOUNT_NAMESPACE = 'core_ui_form';

/** The definition an addon's root is inserted into. It declares its own `controls`. */
export const MOUNT_TARGET = 'compiled_root';

/** What the router needs to know about a compiled screen. */
export interface RoutedFormScreen {
  readonly name: string;
  /** The JSON UI namespace the screen was emitted into: `<addon>_<name>`. */
  readonly namespace: string;
  readonly hasBackdrop: boolean;
}

/** A document and the pack path it is written to. */
export interface PlacedDocument {
  readonly file: string;
  readonly document: Document;
}

export interface FormRouting {
  /** The addon's copy of the mount file: one modification, defining nothing. */
  readonly hook: PlacedDocument;
  /** The addon's router: its root, and a gated host per screen. */
  readonly router: Document;
  /** Pack path the router is written to — the addon's own. */
  readonly routerFile: string;
}

/** Pack path of an addon's compiled-form router. */
export const routerFileOf = (addon: string): string => `ui/core-ui/screens/${addon}_forms.json`;

/** A panel shown only while the form's title is exactly this screen's. */
const gate = (title: string, controls: ControlEntry[]): Control => ({
  type: 'panel',
  size: ['100%', '100%'],
  // Spelled out: a control anchors `center` by default, and everything under
  // here is positioned from the canvas's top-left.
  anchor_from: 'top_left',
  anchor_to: 'top_left',
  property_bag: { '#visible': false },
  visible: '#visible',
  controls,
  bindings: [
    { binding_name: '#title_text' },
    {
      // The whole title, not a prefix of it: one screen's name must never be a
      // prefix of another's, and comparing all of it is what guarantees that.
      binding_type: 'view',
      source_property_name: `(#title_text = '${title}')`,
      target_property_name: '#visible',
    },
  ],
});

/**
 * The documents that put one addon's compiled form screens on the mount.
 *
 * @param screens - Every compiled form screen of the addon, in any order.
 * @param addon - The addon's namespace: it names the router file and every definition in it.
 * @throws ContainerScreenError when two screens share a name.
 */
export const formRouter = (screens: readonly RoutedFormScreen[], addon: string): FormRouting => {
  const seen = new Set<string>();
  const router: Document = { namespace: MOUNT_NAMESPACE };

  for (const screen of screens) {
    if (seen.has(screen.name)) {
      throw new ContainerScreenError(
        `Two screens are named "${screen.name}"; a name becomes part of the title a screen is picked by, `
        + 'and must be unique across the addon.',
      );
    }

    seen.add(screen.name);

    router[`${addon}_gate_${screen.name}`] = gate(formTitleFor(screen.namespace), [
      ...screen.hasBackdrop ? [{ [`backdrop@${screen.namespace}.${BACKDROP_DEFINITION}`]: {} }] : [],
      {
        [`screen@${screen.namespace}.${SCREEN_DEFINITION}`]: {
          anchor_from: 'top_left',
          anchor_to: 'top_left',
        },
      },
    ]);
  }

  router[`${addon}_forms`] = {
    type: 'panel',
    size: ['100%', '100%'],
    anchor_from: 'top_left',
    anchor_to: 'top_left',
    controls: screens.map(screen => ({ [`${screen.name}@${MOUNT_NAMESPACE}.${addon}_gate_${screen.name}`]: {} })),
  };

  return {
    hook: {
      file: MOUNT_FILE,
      document: {
        namespace: MOUNT_NAMESPACE,
        [MOUNT_TARGET]: {
          modifications: [
            {
              array_name: 'controls',
              operation: 'insert_back',
              value: [{ [`${addon}@${MOUNT_NAMESPACE}.${addon}_forms`]: {} }],
            },
          ],
        },
      },
    },
    router,
    routerFile: routerFileOf(addon),
  };
};
