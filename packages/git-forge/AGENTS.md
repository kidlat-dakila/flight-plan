# packages/git-forge

The adapters Flight Plan reaches a repository and its forge through: plain git, GitHub, GitLab, Bitbucket Cloud and Bitbucket Data Center. Read [forge](../../docs/vocabulary/forge.md) before changing anything here.

## Rules

- **One entry.** `src/index.ts` is the only module another project imports, as `@flightplan/git-forge`. The package is consumed as source and has no build step. It depends on no other project of the workspace.
- **A utility, not a feature.** The package knows git and forges, and nothing about Flight Plan's setup, stores, procedures or pages. Choosing a forge for a repository, reading a credential from the keychain, probing for a CLI and turning an adapter's answer into what a page shows stay in `apps/backend`. What only the caller knows arrives as an argument: the token, the base URL, the environment of a subprocess.
- **The structure of the legacy adapter is kept.** `src/git-adapter/` is the extension's `utils/git-adapter/`: one `GitAdapter` interface in `types.ts`, `BaseGitAdapter` for plain git, and one adapter class per forge over `@agntn/forges` and `fetch`, plus the GitHub and GitLab CLI adapters, which share `custom-providers/cli-api-client.ts`. A new forge feature is a new `GitAdapter` method and capability, never a second client beside the adapter.
- **Responses are parsed, never cast.** What a forge or a CLI returns goes through a zod schema before it is used.
- **No ambient environment.** Nothing here reads `process.env`. An adapter that starts a subprocess takes its environment as an option.

## Layout

```
src/index.ts                       what other projects import: assembling and selecting an adapter, reading a remote, splitting a diff, people helpers, the types
src/git-adapter/types.ts           the GitAdapter interface and the shapes it returns
src/git-adapter/base.ts            BaseGitAdapter: plain git through a subprocess
src/git-adapter/*-adapter.ts       one adapter per forge and per way of reaching it
src/git-adapter/custom-providers/  the forge clients the adapters call, and the schemas and mappers of their raw responses
src/git-adapter/helpers/           assembling and selecting an adapter, the remote, REST with retries, diffs, permalinks, people
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p git-forge backend`
- `nx build backend`, then start `node dist/apps/backend/main.js` once: the bundle is CJS and only the built server shows a package that does not load.
