/**
 * Layout properties derived from the flexbox engine.
 *
 * These props are consumed by `withControl()`, stored in `__layout`, and
 * passed to `computeLayout()` during Phase 2 of the render pipeline.
 * They are NOT serialized into the protocol payload — only the resolved
 * `jsonUIx/y/Width/Height` values produced by the layout engine are.
 */
export type {
  AlignContent,
  AlignItems,
  AlignSelf,
  Display,
  FlexDirection,
  FlexSize,
  FlexStyle,
  FlexWrap,
  JustifyContent,
  Percent,
  Position,
  Spacing,
} from '@bedrock-core/flexbox';

import type { FlexStyle } from '@bedrock-core/flexbox';

/**
 * Layout props exposed to component authors.
 * Extends FlexStyle so all flex container + item properties are available.
 */
export interface LayoutProps extends FlexStyle {}
