# Changesets

This folder tracks pending version bumps and changelog entries for the public
`packages/*` workspaces with [Changesets](https://changesets.dev).

## Authoring a changeset

Run `yarn changeset`, select the affected workspaces and a bump level, and write a
short description of the resulting behavior. Commit the generated Markdown file
with the code it describes.

The root `@bedrock-core/ui` is not a changeset target. It follows the runtime.

## Synchronized runtime releases

`@bedrock-core/ui-runtime` and `@bedrock-core/navigation` form a
[fixed release group](https://changesets.dev/guide/fixed-packages). A changeset for
either package versions and publishes both at the same version, using the highest
requested bump. Other workspaces can release independently.

The root `@bedrock-core/ui` mirrors that version through `scripts/bump-meta.mjs`.
All three versions match exactly, including prerelease suffixes. The root and
navigation manifests use `workspace:*` for the runtime dependency, so Yarn packs
an exact dependency on the corresponding released runtime.

`yarn check:release-versions` verifies the fixed group, versions, and dependency
policy. Versioning and publishing stop if they disagree.

## Release workflows

1. A push to `main` refreshes the Version PR through the **Release libraries**
   workflow. `yarn version-packages` applies Changesets, synchronizes the root
   version, checks the release policy, and updates pack versions.
2. Merge the Version PR before running **Release libraries** manually on `main`.
   Publishing requires no pending changesets and passing release gates. The
   workflow publishes the public libraries, including the navigation alias,
   creates their version tags, and ensures the root UI GitHub release exists.
3. The resource-pack workflow consumes the published libraries. The addon
   scaffold is maintained in the separate builder repository.

`yarn test:release` includes isolated versioning tests for runtime-only changes,
changes to the navigation alias, mixed bumps, unrelated releases, and the complete
prerelease lifecycle. These tests use temporary workspaces.
