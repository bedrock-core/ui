// Placeholder. The `ui-compile` filter replaces this in the build workspace
// with one `registerCompiledScreen` call per compiled screen; what is committed
// here is only what the editor and `tsc` read before Regolith has ever run —
// the same arrangement the i18n and guides bundles use.
//
// Importing it is what turns compiled screens on. Without the import every
// screen still renders, serialized by the interpreter, which is what makes the
// whole feature additive.
export {};
