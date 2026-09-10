import {
  ContainerScreenError, type EmbedPlacement, FORM_COLLECTION, FORM_DETAILS_BINDING, formTitleFor,
} from '@bedrock-core/ui-runtime/compile';
import { SCREEN_DEFINITION, BACKDROP_DEFINITION } from '../../emit';
import { entryValueBinding } from '../../connectors/form';
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
  /** Present for a screen drawn into another pack's: gated on the host's marker entry, not the title. */
  readonly marker?: string;
  /** With `marker`: where the screen sits in the host's frame. Absent, the screen is centred like any other. */
  readonly embed?: EmbedPlacement;
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

/** Draws over the host's own content, whichever pack's root comes first under the mount. */
const EMBED_LAYER = 2;

/**
 * A panel shown only while the form's FIRST entry carries this marker: the
 * host that embeds the screen writes it there while the screen is wanted,
 * whatever the host's own title is — an embedded screen cannot know the
 * title of every host that may draw it, and the marker is a fact about the
 * screen alone. Any other form's first entry is a button caption, which never
 * equals a marker; a form with no entries never resolves the binding, and
 * the seeded false holds.
 */
const markerGate = (marker: string, controls: ControlEntry[]): Control => ({
  type: 'stack_panel',
  orientation: 'vertical',
  size: ['100%', '100%'],
  anchor_from: 'top_left',
  anchor_to: 'top_left',
  layer: EMBED_LAYER,
  collection_name: FORM_COLLECTION,
  controls: [{
    gate: {
      type: 'panel',
      size: ['100%', '100%'],
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      collection_index: 0,
      property_bag: { '#visible': false },
      visible: '#visible',
      controls,
      bindings: [
        { ...FORM_DETAILS_BINDING },
        entryValueBinding('#marker', FORM_COLLECTION),
        {
          binding_type: 'view',
          source_property_name: `(#marker = '${marker}')`,
          target_property_name: '#visible',
        },
      ],
    },
  }],
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

    const gated = (controls: ControlEntry[]): Control => (screen.marker === undefined
      ? gate(formTitleFor(screen.namespace), controls)
      : markerGate(screen.marker, controls));

    // Centred, because the box this gate fills is the form's content area,
    // which vanilla sizes 0×0 at the middle of the screen and the interpreter
    // grows through the title; a compiled title carries no size. Anchored
    // top-left, the canvas hung off the screen's centre — drawn down and to
    // the right of it, cut where the screen ended.
    const centred = { anchor_from: 'center', anchor_to: 'center' } as const;

    router[`${addon}_gate_${screen.name}`] = gated([
      ...screen.hasBackdrop ? [{ [`backdrop@${screen.namespace}.${BACKDROP_DEFINITION}`]: {} }] : [],
      screen.embed === undefined
        ? { [`screen@${screen.namespace}.${SCREEN_DEFINITION}`]: centred }
        : {
            // An embedded screen's canvas is the area its host left for it:
            // the host's frame is centred exactly as the host centres its
            // own, and the screen sits in it where the area does.
            frame: {
              type: 'panel',
              size: [...screen.embed.frame],
              ...centred,
              controls: [{
                [`screen@${screen.namespace}.${SCREEN_DEFINITION}`]: {
                  anchor_from: 'top_left',
                  anchor_to: 'top_left',
                  offset: [...screen.embed.offset],
                },
              }],
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
