# Data storage

## Where data is saved

Flight Plan keeps its data in one directory on the user's machine: `~/.flightplan/` by default, or the directory named by the `FLIGHT_PLAN_DATA_DIR` environment variable. Nothing is stored inside the reviewed repository, and nothing is sent anywhere else unless the user publishes a Flight Plan.

One data directory serves every repository the user reviews. Each repository has its own folder, and the configurations are shared by all of them.

```text
~/.flightplan/
├── <repository>/
│   └── targets.json
├── reviews/
│   └── <repository>/
│       ├── <name>.flightplan
│       ├── <name>.pending-comments.json
│       ├── <name>.publications.json
│       └── <name>.reviewed.json
├── publications/
│   └── <repository>/
│       └── <name>/
├── imports/
│   └── <repository>/
│       └── <name>.json
├── conversations/
│   └── <repository>/
│       └── <name>.json
├── configurations/
│   ├── <configuration>/
│   │   ├── configuration.json
│   │   └── <instruction>.md
│   └── settings.json
├── agent-plugin/
│   ├── .claude-plugin/
│   │   └── marketplace.json
│   ├── flightplan/
│   └── flightplan-spawn/
└── server.json
```

| Data | Location | Content |
|---|---|---|
| Review artifacts | `reviews/<repository>/` | One `.flightplan` file per pull request (`pr-412.flightplan`) or branch (`branch-<name>.flightplan`) |
| Pending comments | `reviews/<repository>/` | One `.pending-comments.json` file per review target with comments the reviewer has not submitted: each comment's file, side, lines and text, when it was written, and the commit it was written against. It is emptied when the review is submitted and removed with the review artifact. |
| Reviewed marks | `reviews/<repository>/` | One `.reviewed.json` file per review target the reviewer marked something in: for each waypoint, file and root code block marked as reviewed, a fingerprint of its content when it was marked, so a mark stops counting once that content changes. Marking never changes the `.flightplan` file. A file that cannot be read counts as no marks. It is removed with the review artifact |
| Publications | `reviews/<repository>/` | One `.publications.json` file per review target that was published: where it was published (`description` or `claude`), the address, and when. It is removed with the review artifact |
| Published copies | `publications/<repository>/<name>/` | The page Flight Plan built the last time the review target was published as a Claude artifact: `index.html`, `app.js`, `app.css`, `review-data.js`, which holds the review as the page draws it, and `flight-plan.json`, the `.flightplan` document under a name a Claude artifact can carry. An agent uploads this folder (see [Flight Plan Review](flight-plan-review.md#publishing-as-a-claude-artifact)) |
| Downloads underway | `imports/<repository>/` | The `flight-plan.json` an agent fetched from a Claude artifact, for as long as it takes Flight Plan to read it and store it as a `.flightplan` file (see [Flight Plan Review](flight-plan-review.md#downloading-a-published-flight-plan)) |
| Agent conversations | `conversations/<repository>/` | One JSON file per review target (`pr-412.json`, `branch-feature%2Fweb.json`): the [agent conversation](agent-conversation.md)'s journal and the id of the Claude session Flight Plan resumes for it |
| Review target memory | `<repository>/targets.json` | When Flight Plan first listed the repository (`baselineAt`), the ids of the new review targets the user dismissed (`dismissedTargetIds`), and the review targets the user added to the repository's line by hand (`addedTargets`: a branch by its name, a pull request by its number and its author's login). It is created the first time the repository is listed |
| Saved configurations | `configurations/<configuration>/` | One folder per configuration the user saved, named by its id: each custom configuration (`custom-terse`), and each preset the user changed (`standard`). `configuration.json` holds its name, the preset it is based on and the kinds of context code block it requires; one written with section switches still reads, and they are dropped. Each instruction it overrides is a Markdown file named by its instruction key, as in a preset's folder (`context.md`, `walkthrough.files.waypoints.findings.kind.bug.md`). An instruction it does not override has no file and comes from its preset. Deleting the configuration removes its folder, and resetting a field removes its files |
| Settings | `configurations/settings.json` | The user's settings. Its `defaultConfiguration` field holds the id of the configuration that applies to new reviews (a preset's name, such as `standard`, or a custom configuration's name), or `null` before one is chosen. Its `reviewPreferences` field holds the [review preferences](review-preferences.md), or `null` before the user saves them. Its `setup` field holds what the setup page saved: the agents with their install folders, models and efforts, the forges, and the repositories with their tracked authors and, for a repository whose git config has no email, the author the user chose as themselves |
| Agent plugin | `agent-plugin/` | A Claude plugin marketplace with one plugin, `flightplan`: the review skill and an `.mcp.json` that points at the running server. Beside it, outside the marketplace's plugin list, `flightplan-spawn` holds the hooks that only sessions Flight Plan starts load (see [agent conversation](agent-conversation.md#spawned-sessions)). Flight Plan writes both again each time the agents are saved, and Claude loads `flightplan` from this folder |
| Saved port | `server.json` | The port the `flightplan` command last listened on with every saved agent pointing at it. The next run tries this port first, so the address in the agents' files stays true. When the server has to move to another port, it installs the saved agents again and writes the new port here. A development server neither reads nor writes it |

Forge credentials are never stored in this directory. They go in the operating system keychain (see [forge](forge.md#credentials)).

## The `.flightplan` file

A `.flightplan` file is one review artifact, written with [devalue](https://github.com/Rich-Harris/devalue). The extension marks it as a Flight Plan document, so it can be recognised, opened and shared on its own, outside the data directory.

A [Trace Diagram](trace-diagram.md) refers to the [code blocks](codegraph/code-blocks.md) of its group, and a block refers to its parent, its file and the blocks that use it. JSON cannot write a reference that leads back to itself, and it would write a block two nodes hold twice. devalue writes every object once and every further reference as a pointer to it, so a file that is read back holds the same aliases it was written with: a block of a node is the block of the group, and the group of two segments is one group.

| Because the file keeps aliases | It follows that |
|---|---|
| A block is written once | A diagram costs the size of its group once, however many nodes hold a block of it |
| The whole document is written in one pass | Two segments of one group share that group in the file |
| The text is a list of values and pointers, not a tree | The file is read by Flight Plan, not by hand |

## Document ids

Every stored document is addressed by an id: its kind, its repository and its name, such as `reviews/storefront/pr-412`. The id is also its path under the data directory, without the `.flightplan` extension. There is no index file, and the document does not repeat its own id.

A branch name can contain characters that a file name or a web address cannot carry as they are, the slash of `feature/web` above all. The name of a review target, `pr-<number>` or `branch-<name>`, is therefore encoded before it becomes part of a path or an address:

- In a **web address**, `/pr-reviews/<repository>/<name>`, the name is percent-encoded as one path segment: `branch-feature%2Fweb`. The address with a plain slash does not match the review page.
- In a **file name**, every character other than a letter, a digit, `-`, `_` and `.` is percent-encoded, so `feature/web` is stored as `reviews/<repository>/branch-feature%2Fweb.flightplan`, a file and not a folder, and the name stays valid on every operating system.

An id never contains the data directory. The agent, the web app and the API only ever see ids, never file paths, so nothing outside Flight Plan's storage code can reach a file directly.

## File format

A `.flightplan` document holds what the web app reads, worked out once against the commit it describes: every file section with its waypoints, and every toured file resolved to its lines, their diff marks and the line range of each declaration a waypoint names.

A review artifact's top-level fields:

| Field | Content |
|---|---|
| `schema` | The format version, `4`. A document of version `2` or `3` is read too: version `2` under the names of version `3`, and version `3`, written before nodes were [required](review-artifact.md#required-nodes), with every node of its sections required when an agent writes it. |
| `meta` | The document's kind (`review`), the base commit the change is compared with, and the [review request](flight-plan-review.md#opening-a-review): the configuration, the order of the Code Walkthrough, the writer (an agent with its model and effort, the author, or nobody), when it was made, the last [write-up](flight-plan-review.md#write-up)'s choice, and whether the reviewer declined the write-up |
| `artifact` | The [review artifact](review-artifact.md): its title, its status (`drafting`, `authoring` or `complete`), the [sections](review-artifact.md#sections) it generates, the head commit, its segments, the resolved source files, its [context code blocks](review-artifact.md#context-code-blocks) and the paths of every changed file |

The configuration lives only in `meta`. It is never part of the prompt an agent receives, so the agent reads how to write from Flight Plan's MCP tools.

## Writing rules

- A new document cannot overwrite an existing one. Creating a document that exists fails and points at the update tool, which keeps whatever a person has changed.
- Error messages never include a file path.
- Every id is checked before it becomes a path, so no id can reach a file outside its folder.
