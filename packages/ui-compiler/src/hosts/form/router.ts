import {
  ContainerScreenError, type EmbedPlacement, FORM_COLLECTION, FORM_COMPILED_HEADER, FORM_DETAILS_BINDING, formTitleFor,
} from '@bedrock-core/ui-runtime/compile';
import { SCREEN_DEFINITION, BACKDROP_DEFINITION } from '../../emit';
import { entryValueBinding } from '../../connectors/form';
import type { Control, ControlEntry, Document } from '../../jsonui';

/** Vanilla owns this file and the controls array receiving each addon's bridge. */
export const MOUNT_FILE = 'ui/server_form.json';
export const MOUNT_NAMESPACE = 'server_form';
export const MOUNT_TARGET = 'main_screen_content';

/** Each build owns its router definitions as well as its screen definitions. */
export const routerNamespaceOf = (addon: string): string => `${addon}__forms`;

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
  /** Additive vanilla mount and identical shared properties across addon builds. */
  readonly hook: PlacedDocument;
  /** The addon's router: its root, and a gated host per screen. */
  readonly router: Document;
  /** Pack path the router is written to — the addon's own. */
  readonly routerFile: string;
}

/** Pack path of an addon's compiled-form router. */
export const routerFileOf = (addon: string): string => `ui/core-ui/screens/${addon}_forms.json`;

/** A panel gated by an expression over the current form title. */
const gate = (expression: string, controls: ControlEntry[]): Control => ({
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
      binding_type: 'view',
      source_property_name: expression,
      target_property_name: '#visible',
    },
  ],
});

/** Exact titles keep addons with overlapping names independent. */
const titleExpression = (namespace: string): string => `(#title_text = '${formTitleFor(namespace)}')`;

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
 * The documents that put one addon's compiled form screens on vanilla's form screen.
 *
 * @param screens - Every compiled form screen of the addon, in any order.
 * @param addon - The addon's namespace: it names the router file and every definition in it.
 * @throws ContainerScreenError when two screens share a name.
 */
export const formRouter = (screens: readonly RoutedFormScreen[], addon: string): FormRouting => {
  if (!/^[A-Za-z0-9_-]+$/.test(addon)) { throw new ContainerScreenError(`Invalid UI addon namespace: ${addon}`); }

  const seen = new Set<string>();
  const markers = new Set<string>();
  const namespace = routerNamespaceOf(addon);
  const router: Document = { namespace };

  for (const screen of screens) {
    if (seen.has(screen.name)) {
      throw new ContainerScreenError(
        `Two screens are named "${screen.name}"; a name becomes part of the title a screen is picked by, `
        + 'and must be unique across the addon.',
      );
    }

    seen.add(screen.name);

    if (screen.marker !== undefined) {
      if (markers.has(screen.marker)) {
        throw new ContainerScreenError(`Two embedded screens use marker "${screen.marker}"; give each <Embed> a unique name.`);
      }

      markers.add(screen.marker);
    }

    const gated = (controls: ControlEntry[]): Control => (screen.marker === undefined
      ? gate(titleExpression(screen.namespace), controls)
      : markerGate(screen.marker, controls));

    // The vanilla hook expands the content area to the viewport for compiled
    // titles. Each fixed-size canvas is centred within that area.
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

  const cursorTitles = screens.filter(screen => screen.marker === undefined).map(screen => titleExpression(screen.namespace));

  router[`${addon}_forms`] = {
    type: 'panel',
    size: ['100%', '100%'],
    anchor_from: 'top_left',
    anchor_to: 'top_left',
    controls: [
      ...screens.map(screen => ({ [`${screen.name}@${namespace}.${addon}_gate_${screen.name}`]: {} })),
      ...cursorTitles.length === 0
        ? []
        : [{
            cursor: gate(`(${cursorTitles.join(' or ')})`, [{ 'pointer@core_ui_common.gamepad_cursor_button': {} }]),
          }],
    ],
  };

  const bridge = `${addon}_compiled_form_bridge`;
  const claimed = `(('%.${FORM_COMPILED_HEADER.length}s' * #title_text) = '${FORM_COMPILED_HEADER}')`;
  const vanilla = {
    modifications: [{
      array_name: 'bindings' as const,
      operation: 'insert_back' as const,
      value: [
        { binding_name: '#title_text' },
        { binding_type: 'view' as const, source_property_name: `(not ${claimed})`, target_property_name: '#visible' },
      ],
    }],
  };

  return {
    hook: {
      file: MOUNT_FILE,
      document: {
        namespace: MOUNT_NAMESPACE,
        // All builds use the same recognition rule and viewport properties.
        // Addon-specific gates belong exclusively to their own routers.
        third_party_server_screen: { gamepad_cursor: true },
        long_form: vanilla,
        custom_form: structuredClone(vanilla),
        [bridge]: {
          type: 'panel', size: ['100%', '100%'], anchor_from: 'top_left', anchor_to: 'top_left',
          controls: [{ [`root@${namespace}.${addon}_forms`]: {} }],
        },
        [MOUNT_TARGET]: {
          size: ['0px', '0px'],
          property_bag: { '#size_binding_x': '0px', '#size_binding_y': '0px' },
          modifications: [
            {
              array_name: 'controls',
              operation: 'insert_back',
              value: [{ [`${addon}@${bridge}`]: {} }],
            },
            {
              array_name: 'bindings', operation: 'insert_back', value: [
                { binding_name: '#title_text' },
                ...['x', 'y'].map(axis => ({
                  binding_type: 'view' as const,
                  source_property_name: `((${claimed} and '100%') or '0px')`,
                  target_property_name: `#size_binding_${axis}`,
                })),
              ],
            },
          ],
        },
      },
    },
    router,
    routerFile: routerFileOf(addon),
  };
};
