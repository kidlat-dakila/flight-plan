# packages/configurations

The instructions an agent writes a review artifact with. Read [prompt configurations](../../docs/vocabulary/prompt-configurations.md) and [review artifact](../../docs/vocabulary/review-artifact.md) before changing anything here.

## Rules

- **Data only.** `src/index.ts` is the field catalog, and everything else is Markdown. Reading files and resolving a field for a configuration belong to `apps/backend`.
- **One file per catalog entry, named after the field's path.** `src/system-instructions/<field>.md` says what a field is and is the same for every configuration. `src/default-configurations/<preset>/<field>.md` says how that preset writes an editable field, and `<field>.<option>.md` says what one option of it means.
- **A field is added in three places at once**: the catalog, its system instruction, and its Standard instruction when it is editable. The test fails on a catalog entry with no file and on a file with no entry.
- **Standard is complete.** Every editable field and every option has a file in `standard/`. Another preset's folder holds only what it writes differently, and the rest is read from `standard/`.
- **An instruction describes the artifact as it is stored and the tools as they are.** A field name, a tool name or a refusal named in an instruction must exist in `apps/backend`. Change both in the same change.
- **A path is public.** The review skill and agents ask for fields by path, so renaming one is a breaking change: update `plugin/skills/review/SKILL.md` with it.

## Verify

- `nx run-many -t eslint:lint typecheck test -p configurations backend`
