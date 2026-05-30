import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

export interface TabButtonProps extends ControlProps {
  /** Display label for the tab. Max 80 UTF-8 bytes. */
  label: string;
  /** Whether this tab is currently selected. Controls background styling in the RP. */
  active?: boolean;
  onPress?: () => unknown | Promise<unknown>;
}

/**
 * Internal tab bar button. Serializes as type 'tab_button' so the RP routes it
 * to the tab_bar collection panel instead of the scroll content panel.
 *
 * Byte layout after the common 1024-byte block:
 *   [1024-1106] label  (string, 83 bytes)
 *   [1107-1114] active (bool, 8 bytes)
 *
 * Used exclusively by createTabNavigator — not exported from the public API.
 */
export const TabButton: FunctionComponent<TabButtonProps> = ({
  label,
  active = false,
  onPress,
  ...rest
}: TabButtonProps): JSX.Element => ({
  type: 'tab_button',
  props: {
    ...withControl({
      height: 20,
      background: active ? 'textures/ui/TabTopFront' : 'textures/ui/TabTopBack',
      ...rest,
    }),
    label,
    active,
    onPress: onPress ?? ((): void => {}),
  },
});
