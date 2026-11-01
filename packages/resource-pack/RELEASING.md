# Shared asset releases

Major and minor UI releases produce a new `core-ui-<UI version>.mcpack`.
Patch releases produce an artifact only when resource inputs change. Unchanged
patches retain the existing manifest version and asset release.

`release.json` identifies the UI release owning the selected artifact and hashes
its resource inputs. The hash covers resource files, build configuration and the
published Builder version. Text line endings are normalized across Windows and
CI. The manifest's version label and export destinations are excluded. Source
changes after versioning fail validation rather than silently changing the
selected artifact.

Run `yarn version-packages` from the UI repository to apply Changesets.
It synchronizes the root library version and selects the resource-pack release.
Run `yarn test:release` to verify the selection and release-policy cases.

The library publication workflow creates the UI GitHub release and calls the
resource-pack workflow. Tagged release metadata decides whether to install pack
tooling, build, attach the archive and upload the same asset to CurseForge. An
unchanged patch skips those operations. The manual resource-pack workflow uses
the same decision and enables CurseForge upload by default.

Before publishing libraries that reuse assets, the workflow verifies that the
selected download already exists. If a retained selection was never published,
prepare an artifact for the new candidate before tagging it:

```sh
node scripts/sync-pack-version.mjs --new-artifact
```

The pack UUID is stable. A new artifact's manifest version uses the owning UI
release with its major increased by one. CLI template synchronization copies
that selected version into the production and test behavior manifests. The
scaffolder derives the asset release from those dependencies, so library-only
patches download the retained compatible artifact.
