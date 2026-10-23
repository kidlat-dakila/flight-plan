# Migrations

A **migration** brings the stored data up to a version of Flight Plan. It is a version and a function, and it can read and write everything in the data directory (see [data storage](data-storage.md)), the user's saved choices included. While Flight Plan is in alpha, a migration may overwrite a choice the user made when a version changes what it should be.

## When migrations run

Migrations run only when Flight Plan starts, in the published build and in the development build, before the server takes requests:

1. Flight Plan reads `migratedVersion` from `init.json` in the data directory.
2. It takes each migration newer than `migratedVersion`, or every migration when `init.json` is missing or holds no version. When the newest migration is the one in `init.json`, nothing runs.
3. It runs them one after another, oldest first, and writes the version of each to `init.json` as soon as it succeeds.

A migration that fails is logged under the source `Data migration` (see [troubleshooting](troubleshooting.md)). The migrations after it wait, `init.json` keeps the last one that succeeded, and the next start tries again from there. Flight Plan starts either way.

A development build reads the same data directory unless `FLIGHT_PLAN_DATA_DIR` names another one, so it migrates the user's data too.

## The migrations

| Version | What it does |
|---|---|
| 0.1.11 | When the [review preferences](review-preferences.md) are saved, it turns segments off and sets the section order to Context, Trace Diagram, Code Walkthrough, Blast Diagram, the defaults of 0.1.11. The other preferences stay as they are |

## In the code

`runMigrations` in `apps/backend/src/procedures/run-migrations/` is the procedure, and `main.ts` calls it at the start. `dueMigrationsOf` in its `utils/` picks the migrations to run. Each migration is a file in `utils/migrations/`, named after what it does, and `MIGRATIONS` in `utils/migrations/index.ts` lists them all. `utils/init-file/` reads and writes `init.json`.

A new migration is a file in `utils/migrations/` that exports a `Migration` with the version of the Flight Plan it ships in, added to `MIGRATIONS`. A migration writes the values of its own version, not the current defaults, so it does the same thing when the defaults change again.
