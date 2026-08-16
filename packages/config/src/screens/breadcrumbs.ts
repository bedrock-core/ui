/** How a trail is joined into the single `breadcrumb` route param the config screens carry. */
const SEPARATOR = ' > ';

/**
 * Split a `breadcrumb` route param back into header segments.
 *
 * The param is carried as one already-resolved string (see `ConfigScope`) because it also has to
 * title a native modal, which has no header component to hand segments to. Screens that DO have a
 * `Header` split it again here so the trail renders with the muted separators every other screen
 * uses, rather than one flat run of text.
 */
export function splitBreadcrumb(breadcrumb: string): { title: string; breadcrumbs: string[] } {
  const [head = breadcrumb, ...rest] = breadcrumb.split(SEPARATOR);

  return { title: head, breadcrumbs: rest };
}
