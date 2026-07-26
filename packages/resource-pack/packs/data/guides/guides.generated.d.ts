// Ambient types for the guides filter output. Copied verbatim into the addon's
// packs/data/guides/ by regolith — the same folder that holds the authored <locale>/**.mdx
// content and where the filter writes the sibling .json manifest.
//
// The guide IR type is owned by @bedrock-core/server-runtime (the framework types + stores +
// syncs guide data, like config); this file only declares the generated import path and points
// its type at that single source of truth. Every bedrock-core addon depends on
// @bedrock-core/server-runtime, so the import always resolves.

declare module '@bedrock-core/generated/guides' {
  const manifest: import('@bedrock-core/server-runtime').GuideManifest;

  export default manifest;
}

declare module '*/guides.generated.json' {
  const manifest: import('@bedrock-core/server-runtime').GuideManifest;

  export default manifest;
}
