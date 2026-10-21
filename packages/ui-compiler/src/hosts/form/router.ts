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
  /** The addon's router: selectors and screen cells created only while selected. */
  readonly router: Document;
  /** Pack path the router is written to — the addon's own. */
  readonly routerFile: string;
}

/** Pack path of an addon's compiled-form router. */
export const routerFileOf = (addon: string): string => `ui/core-ui/screens/${addon}_forms.json`;

const canvas = {
  size: ['100%', '100%'] as [string, string],
  anchor_from: 'top_left',
  anchor_to: 'top_left',
} as const;

interface Route {
  key: string;
  id: string;
  cell: string;
}

/** One property lookup supplies the selected cell id, independently of route count. */
const selector = (routes: readonly Route[], addon: string, property: '#title_text' | '#marker'): Control => {
  const factory: Control = {
    type: 'collection_panel',
    ...canvas,
    property_bag: {
      ...property === '#marker' ? { '#marker': '' } : {},
      '#route_': [],
      ...Object.fromEntries(routes.map(route => [`#route_${route.key}`, [route.id]])),
    },
    factory: {
      name: `${addon}_${property === '#marker' ? 'embed' : 'title'}_screen`,
      control_ids: Object.fromEntries(routes.map(route => [route.id, route.cell])),
    },
    bindings: [
      ...property === '#marker'
        ? [{ ...FORM_DETAILS_BINDING }, { ...entryValueBinding('#marker', FORM_COLLECTION), binding_condition: 'always' as const }]
        : [{ binding_name: '#title_text', binding_condition: 'always' as const }],
      {
        binding_type: 'view',
        source_property_name: `('#route_' + ${property})`,
        target_property_name: '#collection_length',
        binding_condition: 'always',
      },
    ],
  };

  if (property === '#title_text') { return factory; }

  // Collection indices belong directly below a collection host.
  return {
    type: 'stack_panel', orientation: 'vertical', ...canvas,
    collection_name: FORM_COLLECTION,
    controls: [{ selector: { ...factory, collection_index: 0 } }],
  };
};

/** Embedded cells draw over their host's content regardless of addon mount order. */
const EMBED_LAYER = 2;

/**
 * Creates only the selected form screen and, when requested, one embedded screen.
 * Title and marker dictionaries each instantiate at most one screen cell.
 */
export const formRouter = (screens: readonly RoutedFormScreen[], addon: string): FormRouting => {
  if (!/^[A-Za-z0-9_-]+$/.test(addon)) { throw new ContainerScreenError(`Invalid UI addon namespace: ${addon}`); }

  const seen = new Set<string>();
  const titles = new Set<string>();
  const markers = new Set<string>();
  const namespace = routerNamespaceOf(addon);
  const router: Document = { namespace };
  const standalone: Route[] = [];
  const embedded: Route[] = [];

  for (const screen of [...screens].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    if (seen.has(screen.name)) {
      throw new ContainerScreenError(`Two screens are named "${screen.name}"; names must be unique across the addon.`);
    }

    seen.add(screen.name);

    if (screen.marker !== undefined) {
      if (markers.has(screen.marker)) {
        throw new ContainerScreenError(`Two embedded screens use marker "${screen.marker}"; give each <Embed> a unique name.`);
      }

      markers.add(screen.marker);
    }

    const key = screen.marker ?? formTitleFor(screen.namespace);

    if (screen.marker === undefined && titles.has(key)) { throw new ContainerScreenError(`Two screens use form title "${key}".`); }

    if (screen.marker === undefined) { titles.add(key); }

    const cell = `${addon}_screen_${screen.name}`;

    (screen.marker === undefined ? standalone : embedded).push({ key, id: screen.name, cell: `${namespace}.${cell}` });

    const centred = { anchor_from: 'center', anchor_to: 'center' } as const;

    router[cell] = {
      type: 'panel', ...canvas,
      ...screen.marker === undefined ? {} : { layer: EMBED_LAYER },
      controls: [
        ...screen.hasBackdrop ? [{ [`backdrop@${screen.namespace}.${BACKDROP_DEFINITION}`]: {} }] : [],
        screen.embed === undefined
          ? { [`screen@${screen.namespace}.${SCREEN_DEFINITION}`]: centred }
          : {
              frame: {
                type: 'panel', size: [...screen.embed.frame], ...centred,
                controls: [{
                  [`screen@${screen.namespace}.${SCREEN_DEFINITION}`]: {
                    anchor_from: 'top_left', anchor_to: 'top_left', offset: [...screen.embed.offset],
                  },
                }],
              },
            },
        ...screen.marker === undefined ? [{ [`cursor@${namespace}.${addon}_cursor`]: {} }] : [],
      ],
    };
  }

  if (standalone.length > 0) {
    router[`${addon}_cursor`] = { type: 'panel', ...canvas, controls: [{ 'pointer@core_ui_common.gamepad_cursor_button': {} }] };
  }

  const selectors: ControlEntry[] = [];

  for (const [routes, property, name] of [
    [standalone, '#title_text', `${addon}_title_selector`],
    [embedded, '#marker', `${addon}_embed_selector`],
  ] as const) {
    if (routes.length === 0) { continue; }

    router[name] = selector(routes, addon, property);
    selectors.push({ [`${name}@${namespace}.${name}`]: {} });
  }

  router[`${addon}_forms`] = {
    type: 'panel', ...canvas,
    controls: selectors,
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
        // All builds use the same recognition rule and viewport geometry.
        // Addon-specific gates belong exclusively to their own routers.
        third_party_server_screen: { gamepad_cursor: true },
        long_form: vanilla,
        custom_form: structuredClone(vanilla),
        // Hidden vanilla action forms must not instantiate their native button widgets.
        long_form_dynamic_buttons_panel: {
          property_bag: { '#title_text': FORM_COMPILED_HEADER },
          bindings: [
            { binding_name: '#title_text', binding_condition: 'always' },
            { binding_type: 'view', source_property_name: `(not ${claimed})`, target_property_name: '#visible', binding_condition: 'always' },
            { binding_name: '#form_button_contents', binding_name_override: '#collection_length', binding_condition: 'always_when_visible' },
          ],
        },
        [bridge]: {
          type: 'panel', ...canvas,
          factory: {
            name: 'server_form_factory',
            control_ids: {
              long_form: `@${namespace}.${addon}_forms`,
              custom_form: `@${namespace}.${addon}_forms`,
            },
          },
        },
        [MOUNT_TARGET]: {
          size: ['100%', '100%'],
          modifications: [
            {
              array_name: 'controls',
              operation: 'insert_back',
              value: [{ [`${addon}@${bridge}`]: {} }],
            },
          ],
        },
      },
    },
    router,
    routerFile: routerFileOf(addon),
  };
};
