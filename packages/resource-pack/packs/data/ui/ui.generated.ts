// Placeholder. The `ui-compiler` filter replaces this in the build workspace
// with one `registerCompiledScreen` call per compiled screen; what is committed
// here is only what the editor and `tsc` read before Regolith has ever run —
// the same arrangement the i18n and guides bundles use.
//
// Importing it is what registers the addon's screens. Without the import
// nothing is registered, and `render()` refuses every screen: a screen is drawn
// from the pack, and the registration is what says which compiled screen it is.
export {};
