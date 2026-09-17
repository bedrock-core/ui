import type { TextFont } from '@bedrock-core/ui-runtime';
import type { ButtonVariant } from './Button';
import type { CardVariant } from './Card';

const BASE = 'textures/ui/ore-styled' as const;

export interface ButtonTextStyle {
  font: TextFont;
  scale: number;
  color: string;
  disabledColor: string;
}

export interface ButtonDef {
  textures: { default: string; hover: string; pressed: string; disabled: string };
  textStyle: ButtonTextStyle;
}

export interface CardDef {
  textures: { background: string };
}

export interface Theme {
  tokens: {
    spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
    fontColor: { default: string; muted: string; danger: string; success: string; disabled: string };
  };
  components: {
    button: {
      padding: { x: number; y: number };
      variants: Record<ButtonVariant, ButtonDef>;
    };
    card: {
      padding: number;
      gap: number;
      variants: Record<CardVariant, CardDef>;
    };
    checkbox: {
      size: number;
      gap: number;
      textures: {
        unchecked: string; uncheckedHover: string; uncheckedDisabled: string;
        checked: string; checkedHover: string; checkedDisabled: string;
      };
    };
    divider: {
      textures: {
        horizontal: { default: string; light: string; dark: string };
        vertical: { default: string; light: string; dark: string };
      };
    };
    header: {
      padding: number;
      gap: number;
      /** Edge of the square back/close controls (px). */
      iconSize: number;
      textStyle: { font: TextFont; scale: number; color: string; colorRgb: readonly [number, number, number]; separator: string };
      textures: {
        background: string;
        back: string; backHover: string; backPressed: string;
        close: string; closeHover: string; closePressed: string;
      };
    };
    /** Icon menu row — the list/guide-index row face, shared by every browse screen. */
    menuRow: {
      padding: number;
      gap: number;
      /** Edge of a row's leading thumbnail (px). */
      iconSize: number;
      textures: { background: string; backgroundHover: string; backgroundPressed: string; backgroundSelected: string };
      textStyle: {
        font: TextFont;
        scale: number;
        color: string;
        disabledColor: string;
        muted: string;
        mutedDisabled: string;
        /** The muted grey a key or a live line takes, which a code cannot colour: `§7` as RGB in 0..1. */
        mutedRgb: readonly [number, number, number];
      };
    };
    radio: {
      size: number;
      gap: number;
      textures: {
        unselected: string; unselectedHover: string; unselectedDisabled: string;
        selected: string; selectedHover: string; selectedDisabled: string;
      };
    };
    tabs: {
      height: number;
      paddingX: number;
      /** How far the chosen tab's label sits lower. */
      selectedDrop: number;
      textures: { normal: string; hover: string; pressed: string; disabled: string; disabledPressed: string };
      /** One font for every tab, and a colour per state as RGB in 0..1. */
      textStyle: {
        font: TextFont;
        scale: number;
        selected: readonly [number, number, number];
        unselected: readonly [number, number, number];
        disabled: readonly [number, number, number];
      };
    };
    toggle: {
      width: number;
      height: number;
      textures: {
        off: string; offHover: string; offDisabled: string;
        on: string; onHover: string; onDisabled: string;
      };
    };
    toggleButton: {
      height: number;
      paddingX: number;
      /** How far a chosen segment's label sits lower, which is what reads as pressed. */
      selectedDrop: number;
      textures: { normal: string; hover: string; pressed: string; disabled: string; disabledPressed: string };
      /**
       * One font for every segment, and a colour per state as RGB in 0..1: a segment's label is
       * drawn inside a native control's faces on a modal, where a `§` code cannot change with state.
       */
      textStyle: {
        font: TextFont;
        scale: number;
        selected: readonly [number, number, number];
        unselected: readonly [number, number, number];
        disabled: readonly [number, number, number];
      };
    };
    itemSlot: {
      size: number;
      textures: {
        slot: string;
        slotHover: string;
        slotDisabled: string;
        equipment: {
          helmet: string;
          chestplate: string;
          leggings: string;
          boots: string;
          shield: string;
        };
      };
    };
    field: {
      padding: { top: number; bottom: number; x: number };
      gap: number;
      textStyle: { font: TextFont; scale: number; value: string; placeholder: string; disabled: string };
      textures: { background: string; backgroundHover: string; backgroundDisabled: string };
    };
    dropdown: {
      padding: { top: number; bottom: number; x: number };
      arrow: { width: number; height: number };
      textStyle: { font: TextFont; scale: number; value: string; disabled: string };
      textures: {
        background: string; backgroundHover: string; backgroundDisabled: string;
        arrow: string; arrowDisabled: string;
        popup: string; option: string; optionHover: string; optionSelected: string;
      };
    };
    form: {
      /** Gap between a field's label and its control (labels live in this layer — the modal primitives are label-free). */
      labelGap: number;
      labelStyle: { font: TextFont; scale: number; bold: boolean; color: string; disabledColor: string };
    };
    slider: {
      height: number;
      /** Height of the track + progress bar, centered vertically within `height`. */
      trackHeight: number;
      thumb: { width: number; height: number };
      textStyle: { font: TextFont; scale: number; value: string; disabled: string };
      textures: {
        track: string; trackDisabled: string;
        progress: string; progressDisabled: string;
        thumb: string; thumbHover: string; thumbDisabled: string;
      };
    };
  };
}

const oreTheme: Theme = {
  tokens: {
    spacing: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 },
    fontColor: { default: '§f', muted: '§7', danger: '§c', success: '§a', disabled: '§8' },
  },
  components: {
    button: {
      padding: { x: 8, y: 4 },
      variants: {
        primary: { textures: { default: `${BASE}/button/primary/background`, hover: `${BASE}/button/primary/background_hover`, pressed: `${BASE}/button/primary/background_pressed`, disabled: `${BASE}/button/disabled/background` }, textStyle: { font: 'mojangles', scale: 1, color: '§f', disabledColor: '§8' } },
        secondary: { textures: { default: `${BASE}/button/secondary/background`, hover: `${BASE}/button/secondary/background_hover`, pressed: `${BASE}/button/secondary/background_pressed`, disabled: `${BASE}/button/disabled/background` }, textStyle: { font: 'mojangles', scale: 1, color: '§0', disabledColor: '§8' } },
        contrast: { textures: { default: `${BASE}/button/contrast/background`, hover: `${BASE}/button/contrast/background_hover`, pressed: `${BASE}/button/contrast/background_pressed`, disabled: `${BASE}/button/disabled/background` }, textStyle: { font: 'mojangles', scale: 1, color: '§f', disabledColor: '§7' } },
        danger: { textures: { default: `${BASE}/button/danger/background`, hover: `${BASE}/button/danger/background_hover`, pressed: `${BASE}/button/danger/background_pressed`, disabled: `${BASE}/button/disabled/background` }, textStyle: { font: 'mojangles', scale: 1, color: '§f', disabledColor: '§8' } },
        realm: { textures: { default: `${BASE}/button/realm/background`, hover: `${BASE}/button/realm/background_hover`, pressed: `${BASE}/button/realm/background_pressed`, disabled: `${BASE}/button/disabled/background` }, textStyle: { font: 'mojangles', scale: 1, color: '§f', disabledColor: '§8' } },
        hero: { textures: { default: `${BASE}/button/primary/background`, hover: `${BASE}/button/primary/background_hover`, pressed: `${BASE}/button/primary/background_pressed`, disabled: `${BASE}/button/disabled/background` }, textStyle: { font: 'minecraftTen', scale: 1, color: '§f', disabledColor: '§8' } },
        transparent: { textures: { default: `${BASE}/button/transparent/background`, hover: `${BASE}/button/transparent/background_hover`, pressed: `${BASE}/button/transparent/background_pressed`, disabled: `${BASE}/button/transparent/background` }, textStyle: { font: 'mojangles', scale: 1, color: '§f', disabledColor: '§8' } },
      },
    },
    card: {
      padding: 8,
      gap: 4,
      variants: {
        'default': { textures: { background: `${BASE}/card/default/background` } },
        'light': { textures: { background: `${BASE}/card/light/background` } },
        'dark': { textures: { background: `${BASE}/card/dark/background` } },
        'raised': { textures: { background: `${BASE}/card/raised/background` } },
        'raised-light': { textures: { background: `${BASE}/card/raised-light/background` } },
        'raised-dark': { textures: { background: `${BASE}/card/raised-dark/background` } },
      },
    },
    checkbox: {
      size: 12,
      gap: 4,
      textures: {
        unchecked: `${BASE}/checkbox/unchecked`,
        uncheckedHover: `${BASE}/checkbox/unchecked_hover`,
        uncheckedDisabled: `${BASE}/checkbox/unchecked_disabled`,
        checked: `${BASE}/checkbox/checked`,
        checkedHover: `${BASE}/checkbox/checked_hover`,
        checkedDisabled: `${BASE}/checkbox/checked_disabled`,
      },
    },
    divider: {
      textures: {
        horizontal: {
          default: `${BASE}/divider/horizontal/default`,
          light: `${BASE}/divider/horizontal/light`,
          dark: `${BASE}/divider/horizontal/dark`,
        },
        vertical: {
          default: `${BASE}/divider/vertical/default`,
          light: `${BASE}/divider/vertical/light`,
          dark: `${BASE}/divider/vertical/dark`,
        },
      },
    },
    header: {
      padding: 4,
      gap: 4,
      iconSize: 15,
      // `color` is the § code a literal takes; `colorRgb` the same black for a
      // localized key, which no code can colour.
      textStyle: { font: 'minecraftTen', scale: 1.2, color: '§0', colorRgb: [0, 0, 0], separator: '§8' },
      textures: {
        background: `${BASE}/header/background`,
        back: `${BASE}/button/back/background`,
        backHover: `${BASE}/button/back/background_hover`,
        backPressed: `${BASE}/button/back/background_pressed`,
        close: `${BASE}/button/close/background`,
        closeHover: `${BASE}/button/close/background_hover`,
        closePressed: `${BASE}/button/close/background_pressed`,
      },
    },
    menuRow: {
      padding: 4,
      gap: 4,
      iconSize: 16,
      textures: {
        background: `${BASE}/dropdown/option/background`,
        backgroundHover: `${BASE}/dropdown/option/background_hover`,
        backgroundPressed: `${BASE}/dropdown/option/background_hover`,
        backgroundSelected: `${BASE}/dropdown/option/background_selected`,
      },
      // Full scale for the subtitle too — a sub-1 scale lands on a fractional
      // font_scale_factor and reads mushy in game; the §7 grey already separates it.
      textStyle: { font: 'mojangles', scale: 1, color: '§f', disabledColor: '§8', muted: '§7', mutedDisabled: '§8', mutedRgb: [2 / 3, 2 / 3, 2 / 3] },
    },
    radio: {
      size: 12,
      gap: 4,
      textures: {
        unselected: `${BASE}/radio/unselected`,
        unselectedHover: `${BASE}/radio/unselected_hover`,
        unselectedDisabled: `${BASE}/radio/unselected_disabled`,
        selected: `${BASE}/radio/selected`,
        selectedHover: `${BASE}/radio/selected_hover`,
        selectedDisabled: `${BASE}/radio/selected_disabled`,
      },
    },
    // Started as a copy of the toggle buttons' values and textures.
    tabs: {
      height: 27,
      paddingX: 8,
      selectedDrop: 1,
      textures: {
        normal: `${BASE}/tabs/background`,
        hover: `${BASE}/tabs/background_hover`,
        pressed: `${BASE}/tabs/background_pressed`,
        disabled: `${BASE}/tabs/background_disabled`,
        disabledPressed: `${BASE}/tabs/background_disabled_pressed`,
      },
      // White whichever way a tab is: the face is what says which is chosen.
      textStyle: { font: 'mojangles', scale: 1, selected: [1, 1, 1], unselected: [1, 1, 1], disabled: [1 / 3, 1 / 3, 1 / 3] },
    },
    toggle: {
      width: 27,
      height: 14,
      textures: {
        off: `${BASE}/toggle/off`,
        offHover: `${BASE}/toggle/off_hover`,
        offDisabled: `${BASE}/toggle/off_disabled`,
        on: `${BASE}/toggle/on`,
        onHover: `${BASE}/toggle/on_hover`,
        onDisabled: `${BASE}/toggle/on_disabled`,
      },
    },
    toggleButton: {
      height: 27,
      paddingX: 8,
      selectedDrop: 1,
      textures: {
        normal: `${BASE}/toggle-button/background`,
        hover: `${BASE}/toggle-button/background_hover`,
        pressed: `${BASE}/toggle-button/background_pressed`,
        disabled: `${BASE}/toggle-button/background_disabled`,
        disabledPressed: `${BASE}/toggle-button/background_disabled_pressed`,
      },
      // White, black and the dark grey of `§8`.
      textStyle: { font: 'mojangles', scale: 1, selected: [1, 1, 1], unselected: [0, 0, 0], disabled: [1 / 3, 1 / 3, 1 / 3] },
    },
    itemSlot: {
      size: 18,
      textures: {
        slot: 'textures/ui/slot_enabled',
        slotHover: 'textures/ui/slot_enabled_hover',
        slotDisabled: 'textures/ui/slot_disabled',
        equipment: {
          helmet: 'textures/ui/empty_armor_slot_helmet',
          chestplate: 'textures/ui/empty_armor_slot_chestplate',
          leggings: 'textures/ui/empty_armor_slot_leggings',
          boots: 'textures/ui/empty_armor_slot_boots',
          shield: 'textures/ui/empty_armor_slot_shield',
        },
      },
    },
    field: {
      padding: { top: 10, bottom: 8, x: 8 },
      gap: 4,
      textStyle: { font: 'mojangles', scale: 1, value: '§f', placeholder: '§7', disabled: '§8' },
      textures: {
        background: `${BASE}/field/background`,
        backgroundHover: `${BASE}/field/background_hover`,
        backgroundDisabled: `${BASE}/field/background_disabled`,
      },
    },
    dropdown: {
      padding: { top: 8, bottom: 10, x: 10 },
      arrow: { width: 7, height: 4 },
      textStyle: { font: 'mojangles', scale: 1, value: '§0', disabled: '§8' },
      textures: {
        background: `${BASE}/dropdown/background`,
        backgroundHover: `${BASE}/dropdown/background_hover`,
        backgroundDisabled: `${BASE}/dropdown/background_disabled`,
        arrow: `${BASE}/dropdown/arrow`,
        arrowDisabled: `${BASE}/dropdown/arrow_disabled`,
        popup: `${BASE}/dropdown/popup`,
        option: `${BASE}/dropdown/option/background`,
        optionHover: `${BASE}/dropdown/option/background_hover`,
        optionSelected: `${BASE}/dropdown/option/background_selected`,
      },
    },
    form: {
      labelGap: 2,
      labelStyle: { font: 'mojangles', scale: 1, bold: false, color: '§f', disabledColor: '§8' },
    },
    slider: {
      height: 20,
      trackHeight: 6,
      thumb: { width: 16, height: 16 },
      textStyle: { font: 'mojangles', scale: 1, value: '§f', disabled: '§8' },
      textures: {
        track: `${BASE}/slider/track`,
        trackDisabled: `${BASE}/slider/track_disabled`,
        progress: `${BASE}/slider/progress`,
        progressDisabled: `${BASE}/slider/progress_disabled`,
        thumb: `${BASE}/slider/thumb`,
        thumbHover: `${BASE}/slider/thumb_hover`,
        thumbDisabled: `${BASE}/slider/thumb_disabled`,
      },
    },
  },
};

export const theme = oreTheme;
