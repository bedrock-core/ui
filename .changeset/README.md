# Changesets

This folder tracks pending version bumps and changelog entries for the public
UI workspaces with [Changesets](https://changesets.dev).

## Authoring a changeset

Run `yarn changeset`, select the affected workspaces and a bump level, and write a
short description of the resulting behavior. Commit the generated Markdown file
with the code it describes.

## Package version policy

The root `@bedrock-core/ui` is a workspace and shares a fixed release group with
`@bedrock-core/ui-runtime`. Changesets keeps their complete versions equal,
including prerelease suffixes. Either package can be selected in a changeset.

Other public workspaces, including `@bedrock-core/navigation`, have independent
versions. Dependency updates can require normal dependent-package releases. The
root pins its UI dependencies with `workspace:*`, so a navigation release can
also produce a UI/runtime patch release without aligning navigation's version.
Yarn packs these workspace references as exact released dependencies.

## Release workflows

1. A push to `main` refreshes the Version PR through the **Release libraries**
   workflow. `yarn version-packages` applies Changesets to the root and child
   workspaces and updates the selected shared texture-pack release.
2. Merge the Version PR before running **Release libraries** manually on `main`.
   Publishing requires no pending changesets and passing release gates. The
   workflow publishes the public libraries, including the root, and uses
   Changesets to create their version tags and GitHub releases.
3. The resource-pack workflow consumes the published libraries. The addon
   scaffold is maintained in the separate builder repository.

`yarn test:release` includes isolated versioning tests for root-only changes,
runtime-only changes, navigation releases, mixed bumps, dependency updates,
prerelease promotion, root changelogs and native tag output. These tests use
temporary Git workspaces.
