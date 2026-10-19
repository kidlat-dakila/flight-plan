# Naming

Code is read far more often than it is written, and names do most of the explaining. A good name lets a reader understand what something is without reading its implementation. A misleading name makes them believe something false.

Language idioms decide the form (casing, file names). These rules decide the words.

## The four properties

1. **Understandable**: the name describes the concept in words the reader already knows. Use Flight Plan's domain vocabulary (review artifact, segment, waypoint, finding, forge, codegraph) or well-known programming terms.
2. **Concise**: every word adds information. `theListOfAllActiveReviewsInTheSystem` should be `activeReviews`.
3. **Consistent**: one word for one concept everywhere. The same concept keeps the same word in the zod schema, the tRPC procedure, the MCP tool, the prop and the variable.
4. **Distinguishable**: names in the same scope are easy to tell apart. `review`, `reviews`, `reviewList` and `reviewData` in one function is a trap.

When they conflict, put understandability first, then consistency with the codebase, then conciseness.

## Choosing words

- **Say what it is, not how it is built**: `findings`, not `findingArray`. `retryDelayMs`, not `intValue`.
- **Use the domain's language**: if the product says "segment", do not call it `chunk` in code.
- **Avoid filler words**: `data`, `info`, `item`, `thing`, `value`, `temp`, `stuff`, and catch-all suffixes like `Manager`, `Handler`, `Processor`, `Helper`, `Util` and `Service`. Ask what it actually manages. A name that is hard to choose often means the thing does too much, so split it.
- **Do not abbreviate** except universal terms (`id`, `url`, `api`, `db`, `max`, `min`, `config`, `pr` in forge code). Never drop vowels (`usrCnt`).
- **Do not mislead**: a `Set` is not `reviewList`, `isValid` must not mutate, and `getX` must not do expensive I/O.
- **Be pronounceable and searchable**: replace magic numbers with named constants (`MAX_GRAPH_DEPTH = 6`).
- **Include units** when they are ambiguous: `timeoutMs`, `sizeBytes`, `widthPx`.
- **Put qualifiers in a consistent place**, usually at the end: `lineStart`, `lineEnd`.

## Length follows scope

- Tiny scope (a short lambda, a loop counter): `i`, `x` and `acc` are fine.
- Function scope: one or two clear words, such as `total` or `changedFiles`.
- Module, exported or public API: fully descriptive, such as `DEFAULT_REQUEST_TIMEOUT_MS` or `buildTraceFlow`.

The wider a name's reach, the more carefully you choose it. tRPC procedure names, MCP tool names, schema fields and file formats are public API and are the hardest to change.

## Rules by kind

- **Variables and constants**: nouns. Constants describe meaning, not value: `MAX_UPLOAD_BYTES`, not `TEN_MEGABYTES`.
- **Booleans**: read as statements, such as `isOpen`, `hasFindings`, `canComment` and `shouldRetry`. Name them positively, never `isNotHidden`. Do not pass bare booleans at call sites. Use an options object or two functions.
- **Collections**: plural nouns (`findings`), or `valueByKey` for maps (`nodeById`). Counts use `findingCount`.
- **Functions**: verb phrases that cover everything the function does: `parseDiff`, `buildBlastDiagram`, `fetchPullRequest`. If a name needs "and" (`validateAndSave`), split the function.
- **Predicates**: questions, such as `isEntryPoint(node)` and `hasUnresolvedFindings(file)`.
- **Conversions**: `toReviewArtifact`, `fromForgeComment`.
- **Verb vocabulary**: use these consistently. `get` is cheap and local, `fetch` is remote, `find` may return nothing, `create`, `build` or `make` construct, `compute` or `calculate` derive, `ensure` creates if missing, `read` and `write` touch storage, and `parse` and `format` convert text.
- **Symmetric pairs** stay symmetric: `open`/`close`, `start`/`stop`, `add`/`remove`, `show`/`hide`, `source`/`target`, `min`/`max`.
- **Types and interfaces**: nouns naming what the thing is, such as `ReviewArtifact` and `ForgeAdapter`. Do not repeat the module name (`review.ReviewReviewArtifact`), and do not use `I` prefixes or `Impl` suffixes. Implementations are named by what distinguishes them: `GithubForgeAdapter`, `InMemoryReviewStore`.
- **Enums and unions**: a singular type name (`FindingSeverity`) with state-like members.
- **Events and callbacks**: past tense for events (`reviewSubmitted`), `on` plus the event for props (`onReviewSubmitted`), and `handle` plus the event for the local handler (`handleSubmit`).
- **Tests**: describe behaviour and outcome, such as `it("rejects a PORT that is not a positive integer")`.

## Casing in this repo

| Kind | Style | Example |
|---|---|---|
| Variables, functions | `camelCase` | `changedFiles`, `buildServer` |
| Types, interfaces, React components | `PascalCase` | `ServerConfig`, `BlastDiagram` |
| Module-level constants | `UPPER_SNAKE_CASE` | `DEFAULT_PORT`, `MCP_PATH` |
| Component folders | `PascalCase` | `components/SetupForm/index.tsx` |
| Feature, route and util folders | `kebab-case` | `routes/pr-reviews/`, `utils/repository-inspector/` |
| Procedure folders | `kebab-case`, verb first | `procedures/list-repositories/`, `procedures/dismiss-new-target/` |
| Procedure exports | `camelCase`, named after the folder | `listRepositories`, `dismissNewTarget` |
| tRPC route exports | `camelCase` procedure name plus `Route` | `listRepositoriesRoute` |
| Other files | `kebab-case` | `review-artifact.ts` |
| tRPC procedure paths | `camelCase` | `repository.list` |
| MCP tool names | `kebab-case` | `update-nodes`, `get-instructions` |
| JSON fields in stored files | `camelCase` | `findingCount` |

Treat acronyms as words: `apiUrl`, `HtmlParser`, `prId`.

Lint enforces the identifier casing, the boolean prefixes (`is`, `has`, `can`, `should`, `was`, `will`, `did`, `are`), the ban on `I` prefixes, and kebab-case file names. Unused parameters take a leading underscore (`_request`). Route files in `apps/frontend/src/routes/` follow TanStack Router's file names instead. Folder names are not checked by lint, so follow the table.

## Names replace comments

Code has no comments. If you want a comment to explain what something is or does, the name is not good enough yet. Rename it, extract a well-named function or variable, or replace a magic value with a named constant.

## Renaming

Review names in this order: misleading names first, then inconsistent vocabulary, then vague filler names, then casing. Rename with the language server, not text replace. Watch for serialized names (stored artifact JSON fields, MCP tool names, tRPC procedure names, environment variables), where a rename is a breaking change that needs a migration.
