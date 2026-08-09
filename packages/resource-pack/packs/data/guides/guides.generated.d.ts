// Ambient types for the guides filter output. Seeded into the addon's
// packs/data/guides/ by `regolith install` — the same folder that holds the authored
// <locale>/**.mdx content and where the filter writes the sibling .json manifest.
//
// The guide IR type is owned by @bedrock-core/guides — the renderer is the only code that
// interprets the IR, so it holds the definition. (The server framework stores and syncs
// manifests without reading inside one, so its own GuideManifest is just a two-field
// envelope.) Anything that consumes this generated module renders guides, and therefore
// already depends on @bedrock-core/guides, so the import always resolves.

declare module '@bedrock-core/generated/guides' {
  const manifest: import('@bedrock-core/guides').GuideManifest;

  export default manifest;
}

declare module '*/guides.generated.json' {
  const manifest: import('@bedrock-core/guides').GuideManifest;

  export default manifest;
}
