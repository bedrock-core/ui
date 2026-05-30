import { FunctionComponent, JSX } from '../jsx';
import { FixedScreenContext } from '../data/FixedScreenContext';
import { useScreenType } from '../hooks/useScreenType';

export interface FixedScreenProps {
  children: JSX.Node;
}

/**
 * Root wrapper for fixed (non-scrolling) screens. Activates the fixed RP layout,
 * where the item grid and other form controls share one fixed coordinate space —
 * nothing scrolls, so ItemRenderer slots stay aligned with buttons/labels.
 *
 * Permits ItemRenderer components inside this tree. Do not nest multiple screens.
 */
export const FixedScreen: FunctionComponent<FixedScreenProps> = ({
  children,
}: FixedScreenProps): JSX.Element => {
  useScreenType('fixed');

  return {
    type: 'context-provider',
    props: {
      __context: FixedScreenContext,
      value: true,
      children,
    },
  };
};
