# Migrations

A **migration** brings the stored data up to a version of Flight Plan. It is a version and a function, and it can read and write everything in the data directory (see [data storage](data-storage.md)), the user's saved choices included. While Flight Plan is in alpha, a migration may overwrite a choice the user made when a version changes what it should be.

There are two kinds. A **data migration** runs when Flight Plan starts and changes the data directory once. A **review artifact migration** changes one `.flightplan` file, when the user asks for it on that review's page (see [Review artifact migrations](#review-artifact-migrations)).

## When data migrations run

Data migrations run only when Flight Plan starts, in the published build and in the development build, before the server takes requests:

1. Flight Plan reads `migratedVersion` from `init.json` in the data directory.
2. It takes each migration newer than `migratedVersion`, or every migration when `init.json` is missing or holds no version. When the newest migration is the one in `init.json`, nothing runs.
3. It runs them one after another, oldest first, and writes the version of each to `init.json` as soon as it succeeds.

A migration that fails is logged under the source `Data migration` (see [troubleshooting](troubleshooting.md)). The migrations after it wait, `init.json` keeps the last one that succeeded, and the next start tries again from there. Flight Plan starts either way.

A development build reads the same data directory unless `FLIGHT_PLAN_DATA_DIR` names another one, so it migrates the user's data too.

## The data migrations

| Version | What it does |
|---|---|
| 0.1.11 | When the [review preferences](review-preferences.md) are saved, it turns segments off and sets the section order to Context, Trace Diagram, Code Walkthrough, Blast Diagram, the defaults of 0.1.11. The other preferences stay as they are |

## In the code

`runMigrations` in `apps/backend/src/procedures/run-migrations/` is the procedure, and `main.ts` calls it at the start. `dueMigrationsOf` in its `utils/` picks the migrations to run. Each migration is a file in `utils/migrations/`, named after what it does, and `MIGRATIONS` in `utils/migrations/index.ts` lists them all. `utils/init-file/` reads and writes `init.json`.

A new migration is a file in `utils/migrations/` that exports a `Migration` with the version of the Flight Plan it ships in, added to `MIGRATIONS`. A migration writes the values of its own version, not the current defaults, so it does the same thing when the defaults change again.

## Review artifact migrations

A review artifact migration is a version and a function that takes a stored `.flightplan` document, read but not yet checked against the schema, and returns it in the shape of that version. Nothing loses its meaning on the way: a migration moves and renames what the file holds, and fills in what the new shape needs.

Each `.flightplan` file names the `version` of the Flight Plan that last saved it (see [data storage](data-storage.md#file-format)). A file with no `version` counts as older than every migration. When a review's page opens, `review.get` compares that version before it reads the artifact:

| The file | The page |
|---|---|
| Saved by this version, or older with no migration since | The review, as always |
| Saved before a review artifact migration | "This Flight Plan needs an update", in place of the review, with "Update this Flight Plan" |
| Saved by a newer Flight Plan | "This Flight Plan comes from a newer version", in place of the review, with "Convert and open" and the command that updates Flight Plan. It warns that parts written in the newer version may not show |

The page shows no part of the artifact, because an artifact of another shape is not one the page can draw. Its header and its settings menu stay, so the review can still be deleted. The button calls `review.migrate`:

- **An older file.** The migrations newer than its version run one after another, oldest first.
- **A newer file.** This version cannot run the newer version's migrations backwards, because it does not have them. It keeps what it knows, drops every field it does not know at any depth, and sets the format number to its own. Defaults fill in what is missing.

The result is checked against the schema and saved with the running version, and the page opens the review. When the result is not a Flight Plan, `review.migrate` fails, the error is logged and the page shows it with Troubleshoot. The file stays as it was.

The agent's tools refuse a file that needs either, and tell the agent to have the reviewer update it in Flight Plan first. An import from a Claude artifact stores a file of another version as it came, and the page offers to update it when it opens.

There are no review artifact migrations yet.

`migrateReview` in `apps/backend/src/procedures/migrate-review/` is the procedure. `reviewVersionStateOf` in its `utils/` decides what a file needs, `planReviewMigration` runs the migrations or the conversion, and `toCurrentShape` drops the unknown fields on devalue's flat list, so that objects the file shares stay shared. Each migration is a file in `utils/artifact-migrations/`, listed in `ARTIFACT_MIGRATIONS`.
