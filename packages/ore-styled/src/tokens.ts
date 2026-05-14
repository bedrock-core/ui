const BASE = 'textures/ui/ore-styled' as const;

export const TEXTURES = {
  button: {
    primary: { default: `${BASE}/button/primary/background`, hover: `${BASE}/button/primary/background_hover`, pressed: `${BASE}/button/primary/background_pressed`, disabled: `${BASE}/button/disabled/background` },
    secondary: { default: `${BASE}/button/secondary/background`, hover: `${BASE}/button/secondary/background_hover`, pressed: `${BASE}/button/secondary/background_pressed`, disabled: `${BASE}/button/disabled/background` },
    contrast: { default: `${BASE}/button/contrast/background`, hover: `${BASE}/button/contrast/background_hover`, pressed: `${BASE}/button/contrast/background_pressed`, disabled: `${BASE}/button/disabled/background` },
    danger: { default: `${BASE}/button/danger/background`, hover: `${BASE}/button/danger/background_hover`, pressed: `${BASE}/button/danger/background_pressed`, disabled: `${BASE}/button/disabled/background` },
    realm: { default: `${BASE}/button/realm/background`, hover: `${BASE}/button/realm/background_hover`, pressed: `${BASE}/button/realm/background_pressed`, disabled: `${BASE}/button/disabled/background` },
    hero: { default: `${BASE}/button/primary/background`, hover: `${BASE}/button/primary/background_hover`, pressed: `${BASE}/button/primary/background_pressed`, disabled: `${BASE}/button/disabled/background` },
  },
  checkbox: {
    unchecked: `${BASE}/checkbox/unchecked`,
    uncheckedHover: `${BASE}/checkbox/unchecked_hover`,
    uncheckedDisabled: `${BASE}/checkbox/unchecked_disabled`,
    checked: `${BASE}/checkbox/checked`,
    checkedHover: `${BASE}/checkbox/checked_hover`,
    checkedDisabled: `${BASE}/checkbox/checked_disabled`,
  },
  radio: {
    unselected: `${BASE}/radio/unselected`,
    unselectedHover: `${BASE}/radio/unselected_hover`,
    unselectedDisabled: `${BASE}/radio/unselected_disabled`,
    selected: `${BASE}/radio/selected`,
    selectedHover: `${BASE}/radio/selected_hover`,
    selectedDisabled: `${BASE}/radio/selected_disabled`,
  },
  toggle: {
    off: `${BASE}/toggle/off`,
    offHover: `${BASE}/toggle/off_hover`,
    offDisabled: `${BASE}/toggle/off_disabled`,
    on: `${BASE}/toggle/on`,
    onHover: `${BASE}/toggle/on_hover`,
    onDisabled: `${BASE}/toggle/on_disabled`,
  },
  select: {
    background: `${BASE}/select/background`,
    arrow: `${BASE}/select/arrow`,
    dropdown: `${BASE}/select/dropdown`,
    item: `${BASE}/select/item`,
    itemHover: `${BASE}/select/item_hover`,
    itemSelected: `${BASE}/select/item_selected`,
  },
  tabs: {
    active: `${BASE}/tabs/tab_active`,
    inactive: `${BASE}/tabs/tab_inactive`,
    inactiveHover: `${BASE}/tabs/tab_inactive_hover`,
    bar: `${BASE}/tabs/bar`,
  },
  card: {
    background: `${BASE}/card/background`,
  },
  toggleButton: {
    normal: `${BASE}/toggle-button/background`,
    hover: `${BASE}/toggle-button/background_hover`,
    pressed: `${BASE}/toggle-button/background_pressed`,
    disabled: `${BASE}/toggle-button/background_disabled`,
    disabledPressed: `${BASE}/toggle-button/background_disabled_pressed`,
  },
  panel: {
    light: `${BASE}/panel/light`,
    dark: `${BASE}/panel/dark`,
  },
  list: {
    item: `${BASE}/list/item`,
    itemHover: `${BASE}/list/item_hover`,
    itemSelected: `${BASE}/list/item_selected`,
  },
  divider: {
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
} as const;

export const SPACING = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export const SIZE = {
  checkbox: 12,
  radio: 12,
  toggle: { width: 27, height: 14 },
  icon: 16,
  sm: 20,
  md: 28,
  lg: 36,
  tab: { height: 20 },
} as const;

export const FONT_COLOR = {
  default: '§f',
  muted: '§7',
  danger: '§c',
  success: '§a',
  disabled: '§8',
} as const;

// ─── Per-variant default text style for auto-labelling ────────────────────────
// Used when Button / ToggleButtonItem receives a plain string as children.

export type ButtonTextFont = 'mojangles' | 'minecraftTen';

export interface ButtonTextStyle {
  font: ButtonTextFont;
  scale: number;
  color: string; // enabled color code (§x)
  disabledColor: string; // disabled color code (§x)
}

export const BUTTON_TEXT_STYLE: Record<'primary' | 'secondary' | 'contrast' | 'danger' | 'realm' | 'hero', ButtonTextStyle> = {
  primary: { font: 'mojangles', scale: 1, color: FONT_COLOR.default, disabledColor: FONT_COLOR.disabled },
  secondary: { font: 'mojangles', scale: 1, color: '§0', disabledColor: FONT_COLOR.disabled },
  contrast: { font: 'mojangles', scale: 1, color: FONT_COLOR.default, disabledColor: FONT_COLOR.muted },
  danger: { font: 'mojangles', scale: 1, color: FONT_COLOR.default, disabledColor: FONT_COLOR.disabled },
  realm: { font: 'mojangles', scale: 1, color: FONT_COLOR.default, disabledColor: FONT_COLOR.disabled },
  hero: { font: 'minecraftTen', scale: 1, color: FONT_COLOR.default, disabledColor: FONT_COLOR.disabled },
} as const;
