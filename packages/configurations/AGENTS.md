# packages/configurations

The shapes of a review artifact and the instructions an agent writes it with. Read [prompt configurations](../../docs/vocabulary/prompt-configurations.md) and [review artifact](../../docs/vocabulary/review-artifact.md) before changing anything here.

## Rules

- **Shapes and data only.** The package holds the artifact's types and schema (`src/artifact/`), the band schemas the review page renders (`src/bands/`), the field catalog (`src/index.ts`) and Markdown. It holds no function that builds, filters or decides anything: building a band belongs to `packages/codegraph`, and reading files and resolving a field for a configuration belong to `apps/backend`.
- **One entry.** `src/index.ts` is the only module another project imports, as `@flightplan/configurations`. It depends on no other project of the workspace.
- **The artifact is described twice, and the two must agree.** `src/artifact/review-artifact.ts` holds the types and `src/artifact/artifact-schema.ts` the zod schema a stored artifact is parsed with. Change both in the same change, with the values they share in `src/artifact/kinds.ts`.
- **A band schema is what the frontend receives.** `src/bands/band-schemas.ts` holds the display-ready shapes of the Journey Flow Diagram, the Blast Diagram and the Code Walkthrough, and the prose, code line and code link shapes they share. A field is added there together with the builder in `packages/codegraph` that fills it.
- **One file per catalog entry, named after the field's path.** `src/system-instructions/<field>.md` says what a field is and is the same for every configuration. `src/default-configurations/<preset>/<field>.md` says how that preset writes an editable field, and `<field>.<option>.md` says what one option of it means.
- **A field is added in three places at once**: the catalog, its system instruction, and its Standard instruction when it is editable. The test fails on a catalog entry with no file and on a file with no entry.
- **Standard is complete.** Every editable field and every option has a file in `standard/`. Another preset's folder holds only what it writes differently, and the rest is read from `standard/`.
- **An instruction describes the artifact as it is stored and the tools as they are.** A field name, a tool name or a refusal named in an instruction must exist in `src/artifact/` or in `apps/backend`. Change both in the same change.
- **A path is public.** The review skill and agents ask for fields by path, so renaming one is a breaking change: update `plugin/skills/review/SKILL.md` with it.

## Verify

- `nx run-many -t eslint:lint typecheck test -p configurations codegraph backend`
