# The document format

The shape every Flight Plan document takes, and what a write is refused for.
Fixed, whatever the profile.

## What a document is

A walkthrough is a **JSON document**. It carries narration and **references to
code**. It never carries code — except a finding's suggested fix, which is code
nobody has written yet.

## What you write, and what is filled in

You write **what you observed**. Flight Plan answers everything else.

| You write | It fills in |
|---|---|
| The symbol a waypoint is about | The line range it lives at |
| Which hunks of the diff a waypoint explains | The lines to highlight |
| A `code:` link in a sentence | The excerpt it shows on hover |
| — | The text that repairs a range when the file moves |
| — | The lines the change added and removed |

So: **never write a mark, an anchor, a diff marker, or a line number you had to
count.** A range you counted out and got wrong renders real code in the wrong
place, with nothing to suggest anything is amiss.

## The skeleton

```jsonc
{
  "schema": 1,
  "meta": {
    "kind": "walkthrough",
    "repo": "acme/storefront",
    "at": { "pr": 412 }, // or { "branch": "stock-guard" }
    "head": "<the 40-character commit you wrote this against>",
    "base": "<the commit the branch forked from>",
    "status": "drafting" // set for you; `complete` flips it
  },
  "title": "<the change's own title, copied>",
  "contextBody": { "context": "…", "overview": [...], "implementation": [...] },
  "diagram": { … } | { "absent": "<one line saying why there is none>" },
  "blast": { … }, // walked by `start`; omitted when none was
  "codeWalkthrough": { "note": "…", "files": [...] },
  "findings": [...] // omit entirely when there is nothing
}
```



Wherever prose mentions code that exists, link to it. A sentence about code that
exists and one about code that does not read alike; a link cannot — it resolves
or the write is refused, so a sentence with links in it is one somebody has
verified.

## What is refused

- A path that is not in the repository.
- A range past the end of a file.
- A symbol nothing can resolve, or one two declarations answer to.
- A `covers` index the file's diff does not have.
- A `code:` link that does not resolve.
- A waypoint with exactly one child.
- An id used twice.
- Marks that go backwards inside one file's section.
- A `question` carrying a trace or a solution.
- A solution on a waypoint that shows no code, or that proposes code, or on a
  document finding whose `code` is `null` or a proposal: there are no lines for
  it to replace.
- On `complete`: a missing overview, a missing implementation list, no file
  sections, a file section with no waypoints, an unanswered call, an unassessed
  dependent, a diagram with nodes and no entry, or a `bug`, `risk` or `nit`
  with lines to replace and no solution.
