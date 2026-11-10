import { registerModule, type ModuleDeclaration } from '@bedrock-core/server-runtime';
import type { ApiConstant } from '@bedrock-core/server-runtime/api';
import type { ScreenMetadata } from '@bedrock-core/ui-runtime';
import type { ScreenReference } from '../runtime/reference';
import type { NavigationSnapshot } from '../runtime/history';

export interface ScreenAnnouncement {
  readonly v: 1;
  readonly screens: readonly ScreenMetadata[];
  readonly references: Readonly<Record<string, ScreenReference>>;
}

export interface OpenRequest {
  readonly playerId: string;
  readonly snapshot: NavigationSnapshot;
}

export interface NavigationApi {
  open(request: NavigationData<OpenRequest>): Promise<boolean>;
}

/** Public navigation data follows the transport's ordinary JSON representation. */
export type NavigationData<T> = unknown extends T ? ApiConstant
  : T extends (...args: never[]) => unknown ? never
    : T extends object ? keyof T extends never ? ApiConstant : { readonly [K in keyof T]: NavigationData<T[K]> } : T;

/** Copy a logical destination or announcement using its existing JSON semantics. */
export function navigationData<T>(value: T): NavigationData<T> {
  // JSON reconstruction removes non-wire optional properties and yields the declared data view.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return JSON.parse(JSON.stringify(value)) as NavigationData<T>;
}

/** Each Runtime owns its screen opener. Registry metadata is published through library declarations. */
export function createNavigationApi(
  open: (request: unknown) => Promise<boolean>,
): ModuleDeclaration<NavigationApi> {
  const API: NavigationApi = {
    open,
  };

  return registerModule(API);
}
