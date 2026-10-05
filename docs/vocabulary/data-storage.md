# Data storage

## Where data is saved

Flight Plan keeps its data in one directory on the user's machine: `~/.flightplan/` by default, or the directory named by the `FLIGHT_PLAN_DATA_DIR` environment variable. Nothing is stored inside the reviewed repository, and nothing is sent anywhere else.

One data directory serves every repository the user reviews. Each repository has its own folder, and the configurations are shared by all of them.

```text
~/.flightplan/
├── <repository>/
│   └── targets.json
├── reviews/
│   └── <repository>/
│       └── <name>.flightplan
├── conversations/
│   └── <repository>/
│       └── <name>.json
├── configurations/
│   ├── custom-configurations/
│   │   └── <name>.json
│   └── settings.json
└── agent-plugin/
    ├── .claude-plugin/
    │   └── marketplace.json
    ├── flightplan/
    └── flightplan-spawn/
```

| Data | Location | Content |
|---|---|---|
| Review artifacts | `reviews/<repository>/` | One `.flightplan` file per pull request (`pr-412.flightplan`) or branch (`branch-<name>.flightplan`) |
| Agent conversations | `conversations/<repository>/` | One JSON file per review target (`pr-412.json`, `branch-feature%2Fweb.json`): the [agent conversation](agent-conversation.md)'s journal and the id of the Claude session Flight Plan resumes for it |
| Review target memory | `<repository>/targets.json` | When Flight Plan first listed the repository (`baselineAt`), and the ids of the new review targets the user dismissed (`dismissedTargetIds`). It is created the first time the repository is listed |
| Custom configurations | `configurations/custom-configurations/` | One JSON file per custom configuration: the preset it is based on, the section switches, and the instructions it overrides |
| Settings | `configurations/settings.json` | The user's settings. Its `defaultConfiguration` field holds the id of the configuration that applies to new reviews (a preset's name, such as `standard`, or a custom configuration's name), or `null` before one is chosen. Its `setup` field holds what the setup page saved: the agents with their install folders and models, the forges, and the repositories with their tracked authors |
| Agent plugin | `agent-plugin/` | A Claude plugin marketplace with one plugin, `flightplan`: the review skill and an `.mcp.json` that points at the running server. Beside it, outside the marketplace's plugin list, `flightplan-spawn` holds the hooks that only sessions Flight Plan starts load (see [agent conversation](agent-conversation.md#spawned-sessions)). Flight Plan writes both again each time the agents are saved, and Claude loads `flightplan` from this folder |

Forge credentials are never stored in this directory. They go in the operating system keychain (see [forge](forge.md#credentials)).

## The `.flightplan` file

A `.flightplan` file is one review artifact, stored as JSON. The extension marks it as a Flight Plan document, so it can be recognised, opened and shared on its own, outside the data directory.

## Document ids

Every stored document is addressed by an id: its kind, its repository and its name, such as `reviews/storefront/pr-412`. The id is also its path under the data directory, without the `.flightplan` extension. There is no index file, and the document does not repeat its own id.

A branch name can contain characters that a file name or a web address cannot carry as they are, the slash of `feature/web` above all. The name of a review target, `pr-<number>` or `branch-<name>`, is therefore encoded before it becomes part of a path or an address:

- In a **web address**, `/pr-reviews/<repository>/<name>`, the name is percent-encoded as one path segment: `branch-feature%2Fweb`. The address with a plain slash does not match the review page.
- In a **file name**, every character other than a letter, a digit, `-`, `_` and `.` is percent-encoded, so `feature/web` is stored as `reviews/<repository>/branch-feature%2Fweb.flightplan`, a file and not a folder, and the name stays valid on every operating system.

An id never contains the data directory. The agent, the web app and the API only ever see ids, never file paths, so nothing outside Flight Plan's storage code can reach a file directly.

## File format

A `.flightplan` document holds two layers:

- **Authored**: what the agent wrote, and only what it observed. For example, a waypoint names the declaration it is about and which of the file's changes it covers.
- **Resolved**: everything the repository can answer, worked out once when the document is written, against the commit it describes. For example, the line range that declaration resolved to, the diff marks for the covered changes, and the text expected on each range's first line, so a range can repair itself if the file moves.

The web app only ever reads the resolved layer. Each resolved shape extends its authored one, so a stored document is still checked against every rule the authored one had to pass.

A review artifact's top-level fields:

| Field | Content |
|---|---|
| `schema` | The format version, `1`. |
| `meta` | The document's kind (`review`), its repository, where it is filed (`{ "pr": 412 }` or `{ "branch": "name" }`), the head commit, the base commit when known, and its status (`drafting` or `complete`) |
| `title` | The pull request's title |
| `contextBody` | The [Context Section](review-artifact.md#context-section) |
| `diagram` | The [Journey Flow Diagram](journey-flow-diagram.md), or `{ "absent": "<reason>" }` |
| `blast` | The [Blast Diagram](blast-diagram.md), or `{ "absent": "<reason>" }`. May be missing. |
| `codeWalkthrough` | The [Code Walkthrough](code-walkthrough.md): a `note` and one entry per file |

## Writing rules

- A new document cannot overwrite an existing one. Creating a document that exists fails and points at the update tool, which keeps whatever a person has changed.
- Error messages never include a file path.
- Every id is checked before it becomes a path, so no id can reach a file outside its folder.
