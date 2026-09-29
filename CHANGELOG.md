# Changelog

All notable changes to Flight Plan are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.5] - 2026-09-24

### Added

- Each option of an enum field, such as a finding's kind, has its own editable
  meaning in the settings. The agent receives the edited meanings.
- A document-level finding can carry a solution for the lines its code names,
  and the panel can preview it.

### Changed

- A solution is required on every `bug`, `risk` and `nit` that has lines to
  replace, on waypoints and at the document level. `complete` refuses a
  document where one is missing. A `question` still carries none.
- The "Code Walkthrough" heading and its filter stay at the top while the files
  scroll. File headers stop below it.
- The diagram board keeps only triggers, ends and starts. A dashed edge joins a
  trigger to an end when hops between them are left out.

## [0.1.4] - 2026-09-24

### Changed

- A waypoint's reading opens with one sentence: what the author did, to what
  kind of code, and what the change does. When the change does several things,
  the reading lists them.
- The prose names what the code does — returns `false`, throws an error — not a
  judgement of it such as "refuses" or "allows", and not review jargon such as
  "guard".

## [0.1.3] - 2026-09-24

### Fixed

- The scaffold of a new file no longer stops with "marks start at line …".
  A card that holds only part of a declaration, such as the closing brace of
  an interface, points at its own lines, not at the whole declaration.
- The "marks go backwards" error names the line where the earlier waypoint
  starts. It said "reaches", which sent authors to the wrong card.
- A pull request whose head commit is not in the checkout is fetched before
  the base is worked out. Before, the scaffold stopped with "Could not work
  out what … forked from", which blamed trunk.

## [0.1.2] - 2026-09-24

### Changed

- The agent instructions ship as Markdown files. The package carries them,
  setup copies them beside the server, and the server reads them when it
  starts. The server does not start when they are missing.
- "Needs attention" marks the few waypoints where the change happens, so a
  reviewer knows where to focus. It no longer marks code that could go wrong;
  that is a finding.
- A waypoint's reading says what the author changed and why it matters to the
  pull request. It links the code outside the card that the change connects
  to.
- The file path at the top of a code panel is larger and bold.

### Fixed

- The waypoints of a new file are placed at their own lines, not all at line 1.
- A waypoint that covers a hunk marks only the lines inside its own range, not
  the whole hunk.
- In a narrow view, the file path of the code panel stays visible below the
  review header while its code scrolls.

## [0.1.1] - 2026-09-23

### Changed

- The call-graph walk is much faster on large changes. It builds one import
  graph of the reviewed version, read from git objects with no checkout, so
  each import is resolved once and the callers of a function come from the
  files that import it, not from a text search.
- A call counts as a call of the changed function only when its name means
  that function. A parameter or a local with the same name is no longer
  reported as a caller.
- TypeScript and JavaScript are read without tree-sitter. The extension no
  longer ships their grammars, and a large walk no longer runs the parser out
  of memory.
- When the walk cannot finish, the scaffold reports the failure. It no longer
  stops at a time limit and writes placeholder boards.

### Added

- The diagram shows what a changed function calls or renders directly, to the
  right of it.
- The server writes a log beside itself (`logs/server.log`): its requests, its
  errors, and counts and timings of each call-graph walk.

### Fixed

- Callers in files that a change moved without editing are found.
- In a remote window (SSH, a dev container), the review panel reaches the
  server: its requests go through the extension.
- The extension refreshes the installed server when it starts it.
- A walkthrough whose change adds a file can be read back.
- `read` says when a scaffold failed after `start` stopped waiting, instead of
  returning an empty opening.
- The panel polls a document every second until it is complete.

## [0.1.0] - 2026-09-23

### Changed

- The review panel renders the stored JSON document directly. Documents are
  JSON only; the Markdown document form is gone, and old `.md` documents are
  not read.
- The panel reads the document, its context and the cited files from the
  server's HTTP API, and follows a document while it is written by polling.
- One panel per document: opening a document again brings its panel forward.
- The panel uses your VS Code theme for the code and the page.

### Added

- A notification when an assistant finishes a walkthrough or a plan, with a
  button that opens it.
- Reviewed marks: mark a waypoint or a file as reviewed to hide it; it comes
  back when its content changes.
- `pnpm dev`: the panel and the API in a browser, with generated samples of
  every document, panel state and setup state.

### Removed

- Walkthroughs published in pull request comments.
- Code wiki pages and their tools.
- The "Open Current File as Walkthrough" command.
- The `flightPlan.codeColumnSide` setting, which nothing read any more.
