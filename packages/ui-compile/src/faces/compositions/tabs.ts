import { entry, placed, topLeft } from '../utils/place';
import { swap } from '../utils/swap';
import type { Box, Control, ControlEntry, Face } from '../utils/types';

/** One tab: the two looks of its header, and the pane it opens. */
export interface Tab {
  name: string;
  /** The header while this tab is not the chosen one, already drawn. */
  header: Control;
  /** The header while it is. */
  headerSelected: Control;
  /**
   * The pane, qualified. A definition of its own so both checked states can
   * name it without emitting it twice.
   */
  pane: string;
}

export interface TabsFace extends Box {
  /** Height of the header row; the panes take what is left. */
  headerHeight: number;
  /** The group's name, carrying the screen's namespace so two groups never pick each other's tabs. */
  group: string;
  tabs: readonly Tab[];
}

/**
 * Several panes on one screen, switched entirely on the client.
 *
 * The pane is a child of its tab's CHECKED state rather than a sibling gated
 * on it. That asymmetry IS the feature: the content exists in the tree exactly
 * when its tab is the chosen one, so nothing outside the toggle has to observe
 * which tab is open and nothing has to be told when it changes.
 *
 * What a tab looks like, chosen and not, is the author's — both arrive drawn.
 */
export const tabsFace: Face<TabsFace> = (data) => {
  const width = data.tabs.length === 0
    ? data.rect.width
    : Math.floor(data.rect.width / data.tabs.length);

  const headers = data.tabs.map((tab, index): ControlEntry => ({
    [tab.name]: swap(
      { group: data.group, index, exclusive: true },
      {
        on: withPane(tab.headerSelected, tab.pane),
        off: tab.header,
      },
      { size: [width, data.headerHeight], offset: [index * width, 0], ...topLeft, layer: 1 },
    ),
  }));

  return entry(data.name, { type: 'panel', ...placed(data), controls: headers });
};

/** A header look with the pane mounted inside it, which is what makes the switch free. */
const withPane = (header: Control, pane: string): Control => ({
  ...header,
  controls: [...Array.isArray(header['controls']) ? header['controls'] : [], { [`pane@${pane}`]: {} }],
});
