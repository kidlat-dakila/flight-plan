# The artifact format

The shape every review artifact takes, and what a write is refused for. Fixed,
whatever the configuration.

## What an artifact is

A review artifact is a JSON document about one pull request or branch. It
carries prose and **references to code**. It never carries code — except a
finding's solution, which is code nobody has written yet.

**Flight Plan builds the structure before you start.** When the reviewer starts
the review, Flight Plan reads the change and scaffolds the artifact: a File
Section per changed file, a waypoint per piece of the change, the diagrams'
nodes where it could trace them, and every toured file resolved to its lines and
diff marks. The reviewer is already reading it while you write.

## What you write, and what is already there

| You write | Flight Plan already set |
|---|---|
| The context | The title, copied from the change |
| A File Section's title and summary, and the order of the File Sections | Which files have a section, and their paths |
| A waypoint's title, reading, needs-attention note and findings | Which waypoints exist, the declaration each is about, and its lines |
| A Journey Flow Diagram node's label, description and category | Which nodes exist and how they connect |
| A Blast Diagram node's label, contract, verdict and effect | Which nodes exist, their rings and how they connect |
| A `code:` link in a sentence | The code a link shows, and every diff mark |

So: **you change words, never structure.** No tool can add, remove or reparent a
file, a waypoint or a node, and no tool takes a line number for a waypoint.

## The shape

```jsonc
{
  "title": "<the change's own title>",
  "status": "drafting", // `complete` flips it
  "commit": "<the head commit the artifact describes>",
  "segments": [
    {
      "id": "all",
      "title": "…",
      "context": "<Markdown>",
      "journey": { "nodes": [...], "edges": [...] }, // or null, with `journeyAbsence` saying why
      "blast": { "nodes": [...], "edges": [...] },   // or null, with `blastAbsence` saying why
      "walkthrough": {
        "intro": "…",
        "files": [{ "path": "…", "title": "…", "summary": ["…"], "waypoints": [...] }]
      }
    }
  ]
}
```

An artifact usually has one segment. When the reviewer split a large change,
each segment carries its own context, diagrams and walkthrough, and a write
names the segment with `segmentId`.

## The tools

| Tool | Does |
|---|---|
| `get-instructions` | How to write each field, for the configuration the reviewer chose |
| `read` | One part of the artifact: `overview` to get oriented, `diff` for the change |
| `nodes` | What is still unwritten, each piece with the code it covers |
| `update-document` | The context, the intro and the file order |
| `update-nodes` | Prose on waypoints, File Sections and diagram nodes, by id, in one batch |
| `complete` | Says the artifact is finished, and checks it |

## What is refused

A refused write changes nothing. A batch is all or nothing: one bad entry writes
none of it, and the refusal names the entry.

- An id or a path the artifact does not have.
- An id that two segments both have, written without `segmentId`.
- A `code:` link that does not resolve.
- A finding id used twice in the artifact.
- A `question` carrying a trace or a solution.
- A `contract` on a dependent, or a `verdict` or an `effect` on a changed
  declaration.
- A `verdict` with no `effect`.
- A file order that does not name every File Section exactly once.
- A `position` on a nested waypoint, past the end of its file, or given to two
  waypoints of one file.
- A reason for a missing diagram on a segment that has that diagram.
- On `complete`: an empty context, a File Section still titled with its path, a
  waypoint with no title or no reading, a Journey Flow Diagram node with no
  label, a changed declaration with no contract, a reachable dependent nobody
  assessed, or a `bug`, `risk` or `nit` with no solution.
