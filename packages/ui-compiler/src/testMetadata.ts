import type { TestRole } from '@bedrock-core/ui-runtime';

export type { TestRole } from '@bedrock-core/ui-runtime';

/** Current JSON contract version for both screen metadata and the pack manifest. */
export const TEST_METADATA_VERSION = 1;
/** Resource-pack-relative location written by the ui-compiler Regolith filter. */
export const TEST_METADATA_PATH = 'bedrock-core/test-metadata.json';

/** How the compiler obtained a name; none of these establish client-rendered text. */
export interface TestName {
  kind: 'literal' | 'translated' | 'bound' | 'declared';
  value: string;
}

/** The compiled screen's host. */
export type TestHost = 'form-action' | 'form-modal' | 'chest';
/** Identifies a concrete host mechanism, independently of a tool's supported actions. */
export type TestInteraction = 'form-button' | 'modal-button' | 'form-input' | 'form-toggle' | 'form-slider' | 'form-dropdown' | 'unsupported';

/** One source control and its concrete instances in the emitted JSON UI document. */
export interface TestControlMetadata {
  node: string;
  role: TestRole;
  testId?: string;
  name?: TestName;
  /** Property paths from the document root, with array indexes encoded as strings. */
  paths: string[][];
  interaction: TestInteraction;
}

/** Metadata returned by an opt-in compileScreen or compileFormScreen call. */
export interface ScreenTestMetadata {
  schemaVersion: typeof TEST_METADATA_VERSION;
  screen: string;
  namespace: string;
  host: TestHost;
  testId?: string;
  controls: TestControlMetadata[];
}

/** SHA-256 of a generated UI file's exact bytes, including whitespace and comments. */
export interface TestMetadataFile {
  /** Resource-pack-relative path using forward slashes. */
  path: string;
  sha256: string;
}

/** A screen's generated file, source module and semantic metadata. */
export interface TestMetadataScreen {
  file: string;
  source: string;
  metadata: ScreenTestMetadata;
}

/** Serializable pack manifest consumed by external testing and inspection tools. */
export interface TestMetadataManifest {
  schemaVersion: typeof TEST_METADATA_VERSION;
  producer: '@bedrock-core/ui-compiler';
  files: TestMetadataFile[];
  screens: TestMetadataScreen[];
}
