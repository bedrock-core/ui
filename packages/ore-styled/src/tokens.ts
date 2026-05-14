import type { TextFont } from '@bedrock-core/ui';

const BASE = 'textures/ui/ore-styled' as const;

export interface ButtonTextStyle {
  font: TextFont;
  scale: number;
  color: string;
  disabledColor: string;
}

export interface ButtonVariant {
  textures: { default: string; hover: string; pressed: string; disabled: string };
  textStyle: ButtonTextStyle;
}

export interface Theme {
  tokens: {
    spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
    fontColor: { default: string; muted: string; danger: string; success: string; disabled: string };
  };
  components: {
    button: {
      padding: { x: number; y: number };
      variants: Record<'primary' | 'secondary' | 'contrast' | 'danger' | 'realm' | 'hero', ButtonVariant>;
    };
    card: {
      textures: { background: string };
      padding: number;
      gap: number;
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
      padding: { x: number; y: number };
      textures: { active: string; inactive: string; inactiveHover: string; bar: string };
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
      textures: { normal: string; hover: string; pressed: string; disabled: string; disabledPressed: string };
      textStyle: { selected: ButtonTextStyle; unselected: ButtonTextStyle };
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
      },
    },
    card: {
      textures: { background: `${BASE}/card/background` },
      padding: 8,
      gap: 4,
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
    tabs: {
      height: 20,
      padding: { x: 8, y: 2 },
      textures: {
        active: `${BASE}/tabs/tab_active`,
        inactive: `${BASE}/tabs/tab_inactive`,
        inactiveHover: `${BASE}/tabs/tab_inactive_hover`,
        bar: `${BASE}/tabs/bar`,
      },
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
      height: 36,
      paddingX: 8,
      textures: {
        normal: `${BASE}/toggle-button/background`,
        hover: `${BASE}/toggle-button/background_hover`,
        pressed: `${BASE}/toggle-button/background_pressed`,
        disabled: `${BASE}/toggle-button/background_disabled`,
        disabledPressed: `${BASE}/toggle-button/background_disabled_pressed`,
      },
      textStyle: {
        selected: { font: 'mojangles', scale: 1, color: '§f', disabledColor: '§8' },
        unselected: { font: 'mojangles', scale: 1, color: '§0', disabledColor: '§8' },
      },
    },
  },
};

export const theme = oreTheme;
