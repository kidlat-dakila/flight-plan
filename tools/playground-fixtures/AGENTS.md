# tools/playground-fixtures

The codegraph's end-to-end cases and the snapshots they write, and the functions another project reads those snapshots through. Read [docs/playground.md](docs/playground.md) before adding a case or a kind: it says how a case is laid out, what a case repository must contain, what is mocked, and how a diff, a context and labels are written.

## Rules

- **One entry.** `src/index.ts` is the only module another project imports, as `@flightplan/playground-fixtures`. It exports `getAllFixtureCases`, `getFixtureRepository`, `getAllReviewArtifactFixturesByCase` and `getReviewArtifactFixture`, which read the committed snapshots and the case repositories from disk. Each takes the path of the test cases folder as its first argument, because the caller knows where that folder is: `apps/backend` bundles this source into its development build, where the source's own location is not known, and passes the path of `test-cases/` in the workspace.
- **A fixture has the shape production code reads.** `getReviewArtifactFixture` returns a snapshot as a `ReviewArtifact` of `@flightplan/configurations`, checked against `reviewArtifactSchema`: `src/review-artifact.ts` maps each segment of the codegraph to a segment of the artifact, and builds the source lines from the case repository with the snapshot's diff applied (`src/apply-diffs.ts`, `src/repository-files.ts`). `getFixtureRepository` returns a kind as the backend's `Repository` of a local git repository, with one pull request review target per snapshot, so the index page shows it through the same procedure, schema and component as a real repository. What a snapshot does not hold (the author, the dates) is a mocked constant. `FixtureRepository` repeats the backend's type because this package cannot import the backend, and the backend's type checker rejects it the day the two differ.
- **Development only.** `apps/backend` imports this package from `utils/fixture-file-catalog/` alone, which only a development build loads. Nothing a production build reaches may import it.
- **`src/` never imports `test-cases/` or `test-setup/`.** They are tests, and lint rejects the import.
- **A case is a repository and a diff.** `test-cases/<kind>/` holds one test file, `<kind>.integration.test.ts`, a `meta.json` that says what the repository is built with (`title`, `packages`, `language`, `mainFramework`), the repository it reads in `repo/`, and one committed snapshot per test in `snapshots/<test name>.snapshot.json`.
- **A case reads top to bottom.** The `it` is titled after the change as `<Implement | Added | Modified | Deleted> <kind> <what>`, and its diffs, its Markdown context and its labels are written inside it, never as constants above it.
- **A case tests `buildBranchCodegraph` of `@flightplan/codegraph`**, through a mocked `@flightplan/git-forge`. `test-setup/mock-git-forge.ts` is a Vitest setup file that replaces `assembleGitAdapter`, `readRemote` and `repoName`, and `setupTest({ repoPath, diffs })` makes them answer from the case.
- **A snapshot holds `title`, `context`, `diff` and `codegraph`.** `expectCaseSnapshot({ context, codegraph, segments })` writes the labels of `segments` into the codegraph first, and refuses a label for something the codegraph does not have.
- **`test-cases/` is skipped by ESLint and TypeScript**, test files included. A test file is checked by running it. `repo/` is data: Vitest and Nx skip `test-cases/*/repo/` too.

## Layout

```
src/index.ts        the functions that list and read the snapshots
src/review-artifact.ts  a snapshot and its files after the change → a review artifact
src/apply-diffs.ts, src/repository-files.ts  base files + diffs → head files, and reading repo/ from disk
test-cases/<kind>/  <kind>.integration.test.ts, meta.json, repo/ and snapshots/
test-setup/         setupTest, the git-forge mock, the case adapter, the case labels, the case snapshot
docs/playground.md  the guide to writing a case
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p playground-fixtures`
- `nx test playground-fixtures` checks every case against its committed snapshot. `nx run playground-fixtures:snapshot` rewrites the snapshots after an intended change in behaviour.
