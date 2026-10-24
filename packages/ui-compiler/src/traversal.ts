import type { Control, ControlEntry } from './jsonui';

const HELPER_GROUP_SIZE = 32;

/** Keep always-mounted, zero-area sources from forming a wide native traversal worklist. */
export function groupRootHelpers(screen: Control, namespace: string): void {
  const controls = screen.controls;

  if (controls === undefined || controls.length <= HELPER_GROUP_SIZE * 2) { return; }

  let sequence = 0;

  const group = (entries: ControlEntry[]): ControlEntry[] => {
    let level = entries;

    while (level.length > HELPER_GROUP_SIZE) {
      const next: ControlEntry[] = [];

      for (let index = 0; index < level.length; index += HELPER_GROUP_SIZE) {
        next.push({ [`${namespace}_root_helpers_${sequence++}`]: {
          type: 'panel', size: [0, 0], offset: [0, 0], anchor_from: 'top_left', anchor_to: 'top_left',
          controls: level.slice(index, index + HELPER_GROUP_SIZE),
        } });
      }

      level = next;
    }

    return level;
  };

  const result: ControlEntry[] = [];
  let helpers: ControlEntry[] = [];

  for (const entry of controls) {
    const children = Object.values(entry);
    const helper = children.length === 1 && children[0].size?.[0] === 0 && children[0].size[1] === 0;

    if (helper) { helpers.push(entry); } else {
      result.push(...group(helpers), entry); helpers = [];
    }
  }

  screen.controls = [...result, ...group(helpers)];
}
