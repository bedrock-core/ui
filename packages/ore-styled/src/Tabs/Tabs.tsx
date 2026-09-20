import type { JSX, TabsProps as PrimitiveTabsProps } from '@bedrock-core/ui-runtime';
import { Tabs as PrimitiveTabs } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { Tab } from './Tab';

export type TabsProps = PrimitiveTabsProps;

/** The elements among a `children` value; a tab is never text. */
const elementsOf = (children: JSX.Node): JSX.Element[] =>
  (Array.isArray(children) ? children : [children])
    .filter((child): child is JSX.Element => typeof child === 'object' && child !== null);

/** A child written as a styled tab, called into the primitive tab it stands for. */
const expand = (child: JSX.Element): JSX.Element => (
  // A child of `<Tabs>` has not been expanded yet, so its type is still the Tab function.
  child.type === (Tab as unknown) && typeof child.type === 'function'
    ? child.type(child.props)
    : child
);

/**
 * Tabs on the theme's faces: panes switched on the client, each header a label
 * drawn the way a segment of `ToggleButtons` is.
 *
 * The primitive `Tabs` with the theme's tab textures as its header faces, and
 * `Tabs.Tab` taking a label rather than a drawn header. Every face is a default
 * — pass `tabBackground`, `tabHover` or `tabSelected` and yours wins — and so is
 * the one-texel overlap between headers, which `gap` replaces.
 */
function TabsRoot({ tabHeight, tabBackground, tabHover, tabSelected, gap = -1, children, ...layout }: TabsProps): JSX.Element {
  const t = theme.components.tabs;
  const tabs = elementsOf(children).map(expand);

  return PrimitiveTabs({
    tabHeight: tabHeight ?? t.height,
    tabBackground: tabBackground ?? t.textures.normal,
    tabHover: tabHover ?? t.textures.hover,
    tabSelected: tabSelected ?? t.textures.pressed,
    // Headers overlap by a texel, so the borders of neighbours fuse into one.
    gap,
    ...layout,
    children: tabs,
  });
}

export const Tabs = Object.assign(TabsRoot, { Tab });
