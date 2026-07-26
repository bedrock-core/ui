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
2. bumps the root **`@bedrock-core/ui`** meta package manually (Changesets can't
   see the workspace root) whenever any of its six dependencies changed —
   `scripts/bump-meta.mjs`;
3. publishes the changed packages to npm and tags each
   `@bedrock-core/<name>@<version>`;
4. when the meta bumped, rebuilds the demo `.mcpack` and attaches it to the
   `@bedrock-core/ui@<version>` release.

> The root `@bedrock-core/ui` is **not** a valid changeset target — do not select
> it. It is versioned automatically from its dependencies. Only add a changeset
> for it if you intend the meta bump script to be bypassed (you generally don't).
