---
name: review
description: Use when reviewing a pull request or a branch with Flight Plan, writing the review artifact for it or picking one up that is half written. Flight Plan has already built the artifact's structure from the change. This skill reads what is unwritten, learns how the reviewer wants it written, and fills in the prose that only a reader of the code can write.
---

# Write a Flight Plan review artifact

Write the prose of a review artifact, so a reviewer follows a change the way it
actually works rather than the way the diff happens to be sorted.

**Flight Plan builds the structure, and you write the words.** When the reviewer
starts a review in Flight Plan's web app, Flight Plan reads the change and
builds the artifact: a File Section per changed file, a waypoint per piece of
the change, and the diagrams' nodes where it could trace them. The reviewer is
reading it while you write. No tool here can add, remove or move a file, a
waypoint or a node.

**Every tool names the review target the same way.** `repositoryName` is the
name Flight Plan lists the repository under, and `targetId` is `pr-<number>` for
a pull request or `branch-<name>` for a branch. The prompt that started you
gives both. A wrong name is refused with the names Flight Plan follows.

**You cannot create an artifact.** If a tool answers that no review artifact
exists yet, the reviewer has not started the review. Ask them to start it in
Flight Plan's web app, then go on.

**Everything about how to write comes from `get-instructions`**: the voice, the
artifact's shape, what a write is refused for, and how to word each field, for
the configuration the reviewer chose. This skill ships no reference files and
names no configuration. There is one place a rule lives, and it is the entry
for the thing the rule is about.

## Reaching the reviewer

The reviewer works in Flight Plan's web app, not in your terminal. Two tools
reach them there:

- `send-message` tells the reviewer something: a summary, a result, a reason.
- `ask-questions` asks one question or a batch. A question offers options to
  pick, or none for a free-text answer, and the reviewer can always write their
  own.

A third tool, `record-publication`, is for one case only. When Flight Plan asks
you to publish a Flight Plan as a Claude artifact, it has built the page and
names its folder: publish that folder as it is with your Artifact tool, then
call `record-publication` with the artifact's address, so the reviewer gets the
link. Never rewrite or restyle the page, and never publish it any other way.

A fourth, `record-import`, is the other direction. When Flight Plan asks you to
fetch a Flight Plan from a Claude artifact, read the file it names with your
Artifact tool, copy it unchanged to the path it gives, and call `record-import`.

The answers come back on the review's listening stream. If you serve the
review with `/flightplan:live`, that skill already listens: go back to it after
asking. Otherwise the result of `ask-questions` gives a `curl` command. Run it in
the foreground; it exits when the reviewer replies, and its output holds the
reply and the command for the next one.

While you work without calling Flight Plan's tools, call `ping` at least every
5 seconds, so the reviewer sees that an agent is online for the review.

## The order of work

Five tools. Describing the change needs no `git`, `gh`, `rg` or file read: if you
are reaching for one of those to write a title, a reading, a label or the
context, the answer is already in a call below.

```
0 get-instructions                   an index of what you can ask for
  get-instructions { fields: ["writingStyle", "codeLinks", "artifactFormat"] }
                                     the voice, how a code link is written, the
                                     artifact's shape and what a write is refused for
1 read { section: "overview" }       every segment's `segmentId`, every id, the files a link can
                                     name, what is unwritten
2 read { section: "diff" }           the whole change, per file, with the waypoints covering it
3 nodes { unfilled: true, needs: ["impact"] }
   update-nodes { segmentId, blast }
                                     what the change does to the files it did not touch
4 (no call)                          Flight Plan orders the File Sections itself
5 update-nodes { segmentId, context, title }
                                     why the change matters, and a very short title for it
6 nodes { unfilled: true }           the next few pieces of work, code attached
   update-nodes { segmentId, waypoints | traceDiagram | traceDiagramDescription }
   …repeat until only `context-description` is left
7 nodes { unfilled: true, needs: ["context-description"] }
   update-nodes { segmentId, contextCodeBlocks }
                                     only where the configuration requires them: what each code
                                     block a reader can hover is, for a reader new to it
8 complete                           checks it, or hands back everything still missing
```

**Step 0 is a read, and it comes before the prose.** `get-instructions` with no
`fields` returns an index of the fields you can ask about. Every review has a
Trace Diagram, a Blast Diagram and a Code Walkthrough. What you write is what
Flight Plan marked required: `nodes { unfilled: true }` and the overview's
`unwritten` list only required nodes, so a part with nothing required is not
yours to write. Do not ask the reviewer about it.

The same call returns `requiresContextCodeBlocks`. Where it is `false`, the
context code blocks are not yours to write either: their fields are not in the
index, and `update-nodes` refuses a description.

**It returns no prose until you ask. Fetch an entry when you reach the work it
is about.** The rules for a diagram are no use while you are assessing reach,
and reading all of them first costs several thousand tokens before you have
written a word.

```
before the first write   { fields: ["writingStyle", "codeLinks", "artifactFormat"] }
before step 3            { fields: ["blastDiagram", "blastDiagram.nodes.impactType", "blastDiagram.nodes.impactReason"] }
before step 5            { fields: ["context", "title"] }
before step 6            { fields: ["walkthrough.files", "walkthrough.files.waypoints",
                                    "walkthrough.files.waypoints.title", "walkthrough.files.waypoints.reading"] }
before a trace label     { fields: ["traceDiagram", "traceDiagram.nodes.label", "traceDiagram.nodes.description",
                                    "traceDiagram.nodes.triggerLabels.label"] }
before a trace description
                         { fields: ["traceDiagram.description"] }
before a finding         { fields: ["walkthrough.files.waypoints.findings"] }
before step 7            { fields: ["contextCodeBlocks", "contextCodeBlocks.description"] }
```

Fetch the one you are about to use, not the next three.

## 1. Get oriented

```
read { section: "overview" }
    → the title, the status, the commit, every segment with its `segmentId`,
      its File Sections, waypoints and diagram nodes, `sources`, and `unwritten`
```

`sources` is every file the artifact holds, each with the declarations a code
link can name. A link to anything else is refused, so this list is what you link
against.

`unwritten` counts what is left, by kind. A diagram the artifact does not have
shows as `null`: there is nothing to fill in there. Flight Plan decides whether
a segment has a diagram, and no tool changes it. If a segment should have one
and does not, tell the reviewer with `send-message`.

**Every write names a segment.** An artifact is usually one segment. When the
reviewer split a large change into segments, each has its own title, context,
diagrams and walkthrough. `read` returns every segment and every changed file
with its `segmentId`, and so does every item `nodes` and `complete` hand out.
Pass that `segmentId` on every `update-nodes` call, one segment per call, even
when the artifact has only one. Flight Plan makes the id, and no tool changes
it.

## 2. Read the change, from the tool and not from git

```
read { section: "diff" }
    → every changed file the artifact holds, its `segmentId`, its changed lines
      with the lines around them, and the ids of the waypoints covering it
```

Do not run `git diff`, `git show` or `gh pr diff`. `paths` narrows it to
particular files and `limit` pages it; pass `next` back as `after`.

`unmentioned` lists changed paths that have no File Section. Test files are set
aside on purpose. Anything else there should be told to the reviewer rather than
quietly left out.

You need the diff for the context, which is about the change as a whole. You do
not need it to write a waypoint: `nodes` attaches the covered code to each one.

## 3. Find what the author did not account for

Only where the overview shows a Blast Diagram.

```
nodes { unfilled: true, needs: ["impact"] }
    → the files the change did not touch that import it, each with
      `importsCarryingTheChange`: the files it imports that bring the change to it
update-nodes { segmentId, blastDiagram: [{ path, impactType, impactReason } | { path, impactType: "unaffected" }] }
```

The Blast Diagram is the files the change is connected to through imports.
Flight Plan draws it. You say, for each file the change reaches, whether the
author forgot it.

1. **Start at the files that import a changed file**, and read each one. They
   are not in the diff, so open them in the repository.
2. **Give each an `impactType`**: `breaks`, `behaviour-changes` or
   `unaffected`. A file that breaks or changes behaviour takes an
   `impactReason` in the same call. An unaffected file takes none.
3. **Mark the file where the change stops `unaffected`.** The files that reach
   the change only through it need no assessment and are no longer handed out.

**A type error is not a finding here.** The compiler reports those. Look for
what compiles and is still wrong: an assumption about a value, an order or a
default that no longer holds, an error that is now thrown or no longer thrown,
a case the author did not handle.

**Then say what you found, in one line, before moving on.** "Nine files import
the change, of which one breaks" is what the reviewer wants before they hear
anything else. Send it with `send-message`.

## 4. Leave the order of the files to Flight Plan

Flight Plan sorts the File Sections of the Code Walkthrough itself: by the
import graph, from the bottom up or from the top down, or with the reviewer's
spotlight and the core changes first, as the reviewer chose. It sorts them again
when you mark a core change. Write no `order`, and do not ask the reviewer how
to order the walkthrough.

## 5. Write the context and the segment's title

```
update-nodes { segmentId, context }   the Context Section, as one string of Markdown
update-nodes { segmentId, title }     the segment's title, a very short text of that context
```

One call can carry all of them. A context replaces the one that was there.

**Write the context first, then the title that sums it up.** A segment arrives
with no title, and `complete` refuses an artifact where one is still missing.

## 6. Write the waypoints and the diagram labels

```
nodes { unfilled: true, limit: 10 }
    → the next pieces of work, each with:
        segmentId the segment it belongs to, which the write names
        needs     what to write: title, reading, segment-title, label, trigger-label,
                  trace-description …
        node      what it holds now
        code      the lines it covers, with what the change did to them
        lineage   its ancestors, for a nested waypoint
update-nodes { segmentId, waypoints: [{ id, title, reading }],
               traceDiagram: [{ id, label, description, triggerLabels: [{ codeBlockId, label }] }],
               traceDiagramDescription }
nodes { unfilled: true }    → total falls
…until total is 0
```

**The code comes to you.** Do not run `git show` or open the file to see a
waypoint's code: it arrives with the waypoint, at the commit the artifact
describes. A line that starts `+` was added, `-` was removed, and a space is
unchanged. `change: "unchanged"` means the diff did not touch those lines.

**The checkout may not be the change.** The working tree is on whatever branch
the reviewer happens to have, which for a pull request is usually not the branch
under review. Take changed code from `nodes` and `read`. Use a file read only
for files outside the change.

**`needs` tells you which field to write.** `nodes { ids: [ … ] }` fetches
particular items the same way when you want to re-read one you already wrote.

**Every write answers with where you stand.** `update-nodes` returns
`nodes: { complete, incomplete }`, the count of the artifact's nodes that need
nothing more and of the ones that still do, and `unwritten`, what is left by
kind. Read it instead of calling `nodes` again only to count.

**A write is checked, and can be refused.** A refused call stores nothing and
says why: a segment the artifact does not have, an id that is not in the segment
the call names, a code link that does not resolve, a `question` carrying a
solution. A batch is all or nothing. Fix the entry it names and send the batch
again. Do not work around a refusal.

**Every Trace Diagram needs a description.** It is the diagram told in
words, in five sentences at most, and the reviewer reads it above the diagram.
`nodes` hands it out as `trace-description`, after the nodes of its diagram,
with the diagram's nodes and edges. Write it with
`update-nodes { segmentId, traceDiagramDescription }` once the labels of that
diagram are written, so it uses their words. `complete` refuses an artifact
where a diagram has none.

**Decide which waypoints carry `coreChange`** from
`get-instructions { fields: ["walkthrough.files.waypoints.coreChange"] }`.
One to three in a pull request is usual.

### Findings

A finding goes on the waypoint it is about, with
`update-nodes { segmentId, waypoints: [{ id, findings: [ … ] }] }`. The list you
send replaces the waypoint's list.

**Findings come out of the same reading as the waypoints.** A finding you did
not see while writing the tour is usually one you inferred from the diff rather
than found in the code.

**Checking a finding is the one part of the job the tools cannot hand you.**
`read` and `nodes` surface the change, and a finding is a claim about the
repository. A guard you think is now unreachable, a caller you think breaks, a
value you think is never `null`: none of those can be settled from a diff. Read
the files the change never touched, and put what you found in the finding's
`trace`.

## 7. Describe the context code blocks, where the configuration requires them

A reader opens a code block, a name of a library or a name of the language by
hovering it in a code view. A configuration can require a written description above that code, for a
reader who has not seen the codebase. `unwritten` then counts
`context-description`, and `read { section: "overview" }` lists the required
blocks under `contextCodeBlocks`.

```
nodes { unfilled: true, needs: ["context-description"], limit: 10 }
    → each item with:
        id        what the write names it by
        node      its `kind`, its name, the library it is from, and `usedBy`: the code that uses it
        file      the file it is in, for code of the repository
        code      its lines, where it has any
update-nodes { segmentId, contextCodeBlocks: [{ id, description }] }
```

**Write them last.** By then you have read the change and the code around it,
and a description names where a block is used. The list belongs to the whole
artifact, so the write takes any `segmentId` the artifact has.

**A description is about the code as it is, not about the change.** One block
has one description, shown wherever its name is hovered.

**`kind` says what the item is.** `codebase` is code of the repository.
`library` is one name imported from a library, listed once however many files
import it, with the import statement of one of them as its code. `language` is
a name its file neither imports nor declares, which Flight Plan assumes is the
language's: it comes with no code, so take how it is used from the change. The
instruction of `contextCodeBlocks.description` says how to write each.

**Where the configuration does not require a block, leave it.** `nodes` hands
out only the required ones, and `update-nodes` refuses any other.

## 8. Say you are finished

**Call `complete`.** Until you do, the reviewer sees the artifact marked as
still being written. It checks the artifact in full. If something is missing it
changes nothing and returns the list, the same one `nodes` hands out. Write
those and call it again.

A write after `complete` puts the artifact back to "still being written", so
call `complete` again after a late correction.

Then tell the reviewer, with `send-message`, that the review is ready and what
it found.

## Picking up an artifact somebody already wrote

**Read it before you write.** `read { section: "full" }` returns every word
already written, as it is stored: there a segment's `segmentId` is its `id`. Keep what is there, and write only what `nodes { unfilled:
true }` still lists or what the reviewer asked you to change. A list you send
replaces the stored one, so send back the entries you are keeping.

**The structure cannot be rebuilt from here.** When the change has moved past
the commit the artifact describes, its waypoints and its code are of the older
commit. Say so to the reviewer rather than describing code you were not handed.
