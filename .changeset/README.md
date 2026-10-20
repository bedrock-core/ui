# Changesets

This folder tracks pending version bumps and changelog entries for the public
`packages/*` workspaces with [Changesets](https://changesets.dev).

## Authoring a changeset

Run `yarn changeset`, select the affected workspaces and a bump level, and write a
short description of the resulting behavior. Commit the generated Markdown file
with the code it describes.

The root `@bedrock-core/ui` is not a changeset target. It follows the runtime.

## Package version policy

Public workspaces, including `@bedrock-core/navigation`, have independent versions.
Each package's Changesets determine its release level. Dependency updates can
require normal dependent-package bumps; no fixed or linked group forces
navigation to share the runtime version.

The root `@bedrock-core/ui` mirrors `@bedrock-core/ui-runtime` through
`scripts/bump-meta.mjs`, including prerelease suffixes. Navigation's version does
not determine the root version or shared UI texture-pack version.

The root and navigation manifests use `workspace:*` for their runtime dependency,
so Yarn packs an exact dependency on the selected released runtime.
`yarn check:release-versions` verifies the umbrella/runtime match, named manifests
and dependency policy. Navigation may have a different version.

## Release workflows

1. A push to `main` refreshes the Version PR through the **Release libraries**
   workflow. `yarn version-packages` applies Changesets, synchronizes the root
   version, checks the release policy, and updates pack versions.
2. Merge the Version PR before running **Release libraries** manually on `main`.
   Publishing requires no pending changesets and passing release gates. The
   workflow publishes the public libraries, including navigation, creates their
   version tags, and ensures the root UI GitHub release exists.
3. The resource-pack workflow consumes the published libraries. The addon
   scaffold is maintained in the separate builder repository.

`yarn test:release` includes isolated versioning tests for runtime-only changes,
navigation-only changes, mixed bumps, dependency updates, unrelated releases and
the prerelease lifecycle. These tests use temporary workspaces.
