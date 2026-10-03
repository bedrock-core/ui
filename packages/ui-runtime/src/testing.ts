/** Semantic roles recorded by the compiler for external testing tools. */
export type TestRole = 'screen' | 'button' | 'checkbox' | 'textbox' | 'slider' | 'combobox' | 'listbox' | 'text' | 'image' | 'group';

/** Build-time declarations; they do not change rendering or native input behavior. */
export interface TestProps {
  /** Stable, case-sensitive identity: a nonblank string of at most 256 characters. */
  testId?: string;
  /** Overrides the inferred semantic role without changing the control's mechanism. */
  testRole?: TestRole;
  /** A declared name for tooling, separate from the text rendered by the client. */
  testName?: string;
}
