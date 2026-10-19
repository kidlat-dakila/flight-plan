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
| A segment's title and its context | The title, copied from the change |
| The order of the File Sections | Which files have a section, and their paths |
| A waypoint's title, reading, core-change note and findings | Which waypoints exist, the declaration each is about, and its lines |
| A Trace Diagram's description, a node's label and description, and the label of each of its trigger labels | Which nodes exist, how they connect, which node is inside which, and which trigger labels a node has |
| A Blast Diagram file's impact type and impact reason, on a file the change did not touch | Which files exist, which the change touched and how they import each other |
| A context code block's description, where the block is required | Which code blocks are listed, and which are required |
| A `code:` link in a sentence | The code a link shows, and every diff mark |
| | Whether a segment has each diagram, and the line saying why it has none |

So: **you change words, never structure.** No tool can add, remove or reparent a
file, a waypoint or a node, and no tool takes a line number for a waypoint.

## What this review asks you to write

Each node says whether this review asks you to write it: `isRequired` on a
waypoint, a Trace Diagram node, a Trace Diagram (its description) and a Blast
Diagram file, and `isContextRequired` on a segment (its title and context).
Write only the nodes marked `true`. A write to any other node is refused.
`nodes` lists only the work on required nodes, and `complete` succeeds once
every required node is written. The reviewer can ask for more later; those
nodes are then marked required, and Flight Plan tells you.

## The shape

```jsonc
{
  "title": "<the change's own title>",
  "status": "drafting", // `complete` flips it
  "commit": "<the head commit the artifact describes>",
  "segments": [
    {
      "id": "3f9a1c2e",
      "title": "<a very short text of the context>",
      "context": "<Markdown>",
      "traceDiagram": { "description": "…", "nodes": [...], "edges": [...] }, // or null when the segment has none
      "blastDiagram": { "nodes": [...], "edges": [...], "importBound": { "nodes": [...], "edges": [...] } },   // or null when the segment has none
      "walkthrough": {
        "files": [{ "path": "…", "waypoints": [...] }]
      }
    }
  ],
  "contextCodeBlocks": [{ "id": "<the item's id>", "kind": "codebase", "isRequired": true, "description": "<Markdown>" }]
}
```

An artifact usually has one segment. When the reviewer split a large change,
each segment carries its own context, diagrams and walkthrough. Every write
names the segment it writes with `segmentId`, whether the artifact has one
segment or several, and `read` and `nodes` return that id with everything they
hand back.

`contextCodeBlocks` belongs to the whole artifact and to no segment: one item
per code block, name of a library or name of the language a reader can open by
hovering it. A write to it still
names a `segmentId`, and any segment of the artifact will do.

## The tools

| Tool | Does |
|---|---|
| `get-instructions` | How to write each field, for the configuration the reviewer chose |
| `read` | One part of the artifact: `overview` to get oriented, `diff` for the change |
| `nodes` | What is still unwritten, each piece with the code it covers |
| `update-nodes` | Every word you write, on one segment, in one batch: its title, context, file order and Trace Diagram description by name, and its waypoints, diagram nodes and context code blocks by id. Answers with how many nodes are complete and how many are not |
| `complete` | Says the artifact is finished, and checks it |

## What is refused

A refused write changes nothing. A batch is all or nothing: one bad entry writes
none of it, and the refusal names the entry.

- An id or a path the artifact does not have.
- A `segmentId` the artifact does not have, or an id that is not in the segment
  the call names.
- A `code:` link that does not resolve.
- A finding id used twice in the artifact.
- A `question` carrying a trace or a solution.
- An `impactType` or an `impactReason` on a file of the change.
- A `breaks` or a `behaviour-changes` with no `impactReason`, or an `impactReason` on an `unaffected` file.
- A file order that does not name every File Section exactly once.
- A `traceDiagramDescription` on a segment that has no Trace Diagram.
- A `position` on a nested waypoint, past the end of its file, or given to two
  waypoints of one file.
- On `complete`: an empty context, a segment with no title, a
  waypoint with no title or no reading, a Trace Diagram with no description, a Trace Diagram node or one of its trigger labels with no
  label, a file the change reaches that nobody assessed, or a `bug`, `risk` or
  `nit` with no solution.
