# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).
It tracks pending version bumps + changelog entries for the **`packages/*`**
libraries.

## Authoring a changeset

When you make a change worth releasing, run:

```sh
yarn changeset
```

Pick the affected package(s) and a bump level (`patch` / `minor` / `major`),
write a short summary, and commit the generated `.changeset/<name>.md` alongside
your change.

## How releasing works

Releasing is a single manual **"Publish Release"** GitHub Action
(`workflow_dispatch`, no inputs — just pick the branch). It:

1. runs `changeset version` — consumes the pending changesets, bumps the changed
   sub-packages **and their dependents** (`updateInternalDependencies: patch`),
   and writes CHANGELOGs;
2. sets the root **`@bedrock-core/ui`** meta package's version (Changesets can't
   see the workspace root) — `scripts/bump-meta.mjs`;
3. publishes the changed packages to npm and tags each
   `@bedrock-core/<name>@<version>`;
4. when the meta bumped, rebuilds the demo `.mcpack` and attaches it to the
   `@bedrock-core/ui@<version>` release.

`server` and `apps` are checked out beside this repo for the install: the root
`resolutions` reach their packages through `portal:` entries.

## The meta is the runtime

**`@bedrock-core/ui`'s version IS `@bedrock-core/ui-runtime`'s**, character for
character, prerelease tag included. The runtime is what the meta is; every other
package it re-exports is support around it, so `@bedrock-core/ui@1.0.0-rc.1` is
`@bedrock-core/ui-runtime@1.0.0-rc.1` and there is no second number to reconcile.

A release the runtime does not move leaves the meta where it is: what shipped was
a package the meta curates, and the curated set is republished with the runtime
that next moves.

> The root `@bedrock-core/ui` is **not** a valid changeset target — do not select
> it. It follows the runtime, and a changeset for it would only fight the script.

`0.0.0` is what an unreleased package sits at, and `publish-tarballs.mjs` skips
it, so a package reaches its first release by having its `version` set by hand in
the commit that means to ship it.
