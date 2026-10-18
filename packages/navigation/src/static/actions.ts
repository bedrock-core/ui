import type { InitialState, NavigationAction, NavigationDestination, NavigateArgs, PopToArgs, ScreenArgs } from './common';
import type { RegisteredParams, RootParams, StackParams, TabParams } from './inference';
import { copyData } from './definitions';

export function plainParams(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (value === undefined) { return undefined; }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) { throw new Error('Route params must be an object.'); }

  return Object.fromEntries(Object.entries(copyData(value)));
}

/** Checks the portable action shape before a dynamic action reaches a scoped router. */
export function isNavigationAction(value: unknown): value is NavigationAction {
  if (value === null || typeof value !== 'object' || !('type' in value) || typeof value.type !== 'string') { return false; }

  if (('source' in value && typeof value.source !== 'string') || ('target' in value && typeof value.target !== 'string')) { return false; }

  if (['GO_BACK', 'POP_TO_TOP'].includes(value.type)) { return true; }

  if (!('payload' in value) || value.payload === null || typeof value.payload !== 'object' || Array.isArray(value.payload)) { return false; }

  const payload = value.payload;

  if (['POP', 'DISMISS'].includes(value.type)) { return 'count' in payload && Number.isSafeInteger(payload.count) && Number(payload.count) > 0; }

  if (value.type === 'RESET') { return 'routes' in payload && Array.isArray(payload.routes) && payload.routes.every((route: unknown) => route !== null && typeof route === 'object' && 'name' in route && typeof route.name === 'string'); }

  if (['SET_PARAMS', 'REPLACE_PARAMS', 'PUSH_PARAMS'].includes(value.type)) {
    return !('params' in payload)
      ? value.type !== 'SET_PARAMS'
      : payload.params !== null && typeof payload.params === 'object' && !Array.isArray(payload.params);
  }

  if (!['NAVIGATE', 'PUSH', 'REPLACE', 'POP_TO', 'JUMP_TO'].includes(value.type) || !('name' in payload) || typeof payload.name !== 'string') { return false; }

  return (!('params' in payload) || (payload.params !== null && typeof payload.params === 'object' && !Array.isArray(payload.params)))
    && (!('merge' in payload) || typeof payload.merge === 'boolean') && (!('pop' in payload) || typeof payload.pop === 'boolean');
}

export function readAction(value: unknown): NavigationAction {
  const data = copyData(value);

  if (!isNavigationAction(data)) { throw new Error('Invalid navigation action.'); }

  return data;
}

export function destinationAction(type: 'NAVIGATE' | 'PUSH' | 'REPLACE' | 'POP_TO' | 'JUMP_TO', args: readonly unknown[]): NavigationAction {
  const first = args[0];
  const payload = typeof first === 'object' && first !== null
    ? first
    : { name: first,
        ...args[1] === undefined ? {} : { params: args[1] }, ...typeof args[2] === 'object' ? args[2] : {} };

  return readAction({ type, payload });
}

function navigateAction(...args: NavigateArgs<RegisteredParams>): NavigationAction<RegisteredParams>;
function navigateAction(destination: NavigationDestination<RegisteredParams>): NavigationAction<RegisteredParams>;

function navigateAction(...args: unknown[]): unknown { return destinationAction('NAVIGATE', args); }

function pushAction(...args: ScreenArgs<StackParams>): NavigationAction<StackParams> & { readonly type: 'PUSH' };

function pushAction(...args: unknown[]): unknown { return destinationAction('PUSH', args); }

function replaceAction(...args: ScreenArgs<StackParams>): NavigationAction<StackParams> & { readonly type: 'REPLACE' };

function replaceAction(...args: unknown[]): unknown { return destinationAction('REPLACE', args); }

function popToAction(...args: PopToArgs<StackParams>): NavigationAction<StackParams> & { readonly type: 'POP_TO' };

function popToAction(...args: unknown[]): unknown { return destinationAction('POP_TO', args); }

function jumpAction(...args: ScreenArgs<TabParams>): NavigationAction<TabParams> & { readonly type: 'JUMP_TO' };

function jumpAction(...args: unknown[]): unknown { return destinationAction('JUMP_TO', args); }

export const CommonActions = {
  navigate: navigateAction,
  goBack: (): { readonly type: 'GO_BACK' } => ({ type: 'GO_BACK' }),
  reset: (state: InitialState<RootParams>): NavigationAction<RootParams> => ({ type: 'RESET', payload: copyData(state) }),
  setParams: (params: object): NavigationAction & { readonly type: 'SET_PARAMS' } => ({ type: 'SET_PARAMS', payload: { params: copyData(params) } }),
  replaceParams: (params: object): NavigationAction & { readonly type: 'REPLACE_PARAMS' } => ({ type: 'REPLACE_PARAMS', payload: { params: copyData(params) } }),
  pushParams: (params: object): NavigationAction & { readonly type: 'PUSH_PARAMS' } => ({ type: 'PUSH_PARAMS', payload: { params: copyData(params) } }),
};
export const StackActions = {
  push: pushAction, replace: replaceAction, popTo: popToAction,
  pop: (count = 1): NavigationAction & { readonly type: 'POP' } => ({ type: 'POP', payload: { count } }),
  popToTop: (): { readonly type: 'POP_TO_TOP' } => ({ type: 'POP_TO_TOP' }),
  dismiss: (count = 1): NavigationAction & { readonly type: 'DISMISS' } => ({ type: 'DISMISS', payload: { count } }),
};
export const TabActions = { jumpTo: jumpAction };
