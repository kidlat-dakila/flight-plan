# Flight Plan Review

## Definition

A Flight Plan Review is a way of reading a pull request as a guided tour instead of a list of changed files. A coding agent writes a [review artifact](review-artifact.md) for the change through Flight Plan's MCP tools, and the reviewer reads it in the Flight Plan web app, next to the code it describes.

A review can cover a pull request on a [forge](forge.md) such as GitHub, GitLab or Bitbucket, or a branch in a repository that has no forge at all.

## Why it exists

A diff shows every changed line, one file at a time, in alphabetical order. It does not show how the change works: which file to read first, what calls the changed code, what the change can break, or which ten lines out of five hundred deserve a slow read. On a large pull request, reviewers skim, and the important part gets the same attention as a renamed import.

A Flight Plan Review answers those questions directly:

- **Why the change exists**, in a few sentences a reviewer can read before any code.
- **How it runs**, as a [Journey Flow Diagram](journey-flow-diagram.md) from what starts it to the changed code.
- **What it can affect**, as a [Blast Diagram](blast-diagram.md) of everything that depends on the changed code.
- **Where to look**, as a [Code Walkthrough](code-walkthrough.md) that puts an explanation on top of the lines it is about, with findings on the code they concern.

Guided review has one standing objection: a curated tour can leave out the file that mattered, and a diff cannot leave out anything. Flight Plan answers it in two ways. The structure of both diagrams is derived from the code by the [codegraph](codegraph.md), not written by the agent, so the agent cannot leave a caller out or invent one. And the walkthrough states how much of the change it covers, so a gap is visible instead of silent.

## How a review happens

1. The reviewer picks a pull request or branch in the web app, from the list the forge provides.
2. The reviewer makes a [review request](#review-request) on the review target's page.
3. Flight Plan builds the structure of the artifact from the change and saves it with the request. The page opens the artifact at once, marked as drafting, so the reviewer can start reading the code. At the same time Flight Plan starts the chosen coding agent with a prompt, or gives the reviewer the prompt to paste into their own agent session. The agent works with the Flight Plan review skill.
4. The agent fills in the prose through the MCP tools: each segment's title and context, labels and explanations, findings. It can change the words, never the structure.
5. The artifact opens in the web app while it is still being written, marked as drafting, and fills in as the agent works.
6. The agent marks the artifact complete. Completing it runs the checks a finished artifact must pass.
7. The reviewer reads it. Marking a waypoint or a file as reviewed hides it until its content changes. When the pull request moves past the commit the artifact describes, the web app says the artifact is stale.

## Review request

A review request is what the reviewer asks for before an agent writes a review artifact. A review target with no review artifact shows the request form in place of the review. It holds three choices:

| Choice | Content |
|---|---|
| Configuration | The [prompt configuration](prompt-configurations.md) the agent writes with. The default configuration is listed first and selected. |
| Order of the Code Walkthrough | One of the [orders](code-walkthrough.md#order), or the reviewer's own instruction. |
| Agent | A coding agent set up in Flight Plan, the model it runs and the effort it works at, or the reviewer prompting their agent themselves. |

While a review target has no review artifact, the page's header also states how many files of each kind the change touches.

The request is saved inside the review artifact, so the choices are never lost. The prompt names the review target, how to reach Flight Plan and the order of the Code Walkthrough. It never names the configuration: the agent reads that from Flight Plan's MCP tools.

## Who writes what

| Part | Written by |
|---|---|
| Structure: which nodes exist, how they connect, which files and lines the walkthrough covers | Flight Plan, from the code |
| Everything a reader could check against the repository: line ranges, diff marks, the code behind a link | Flight Plan, resolved when the artifact is written |
| Prose: context, labels, explanations, findings, verdicts | The agent |
| The pull request's title | Copied from the forge, never rewritten |
| How the agent writes each part | The active [prompt configuration](prompt-configurations.md) |
