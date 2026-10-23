# Flight Plan Review

## Definition

A Flight Plan Review is a way of reading a pull request as a guided tour instead of a list of changed files. Flight Plan builds a [review artifact](review-artifact.md) for the change from the code itself, and the reviewer reads it in the Flight Plan web app, next to the code it describes. A coding agent writes the artifact's prose through Flight Plan's MCP tools.

A review can cover a pull request on a [forge](forge.md) such as GitHub, GitLab or Bitbucket, or a branch in a repository that has no forge at all.

## Why it exists

A diff shows every changed line, one file at a time, in alphabetical order. It does not show how the change works: which file to read first, what calls the changed code, what the change can break, or which ten lines out of five hundred deserve a slow read. On a large pull request, reviewers skim, and the important part gets the same attention as a renamed import.

A Flight Plan Review answers those questions directly:

- **Why the change exists**, in a few sentences a reviewer can read before any code.
- **How it runs**, as a [Trace Diagram](trace-diagram.md) from what starts it to the changed code.
- **What it can affect**, as a [Blast Diagram](blast-diagram.md) of the files the change is connected to through imports, and what it does to the ones it did not touch. Its second view shows the files the change itself uses.
- **Where to look**, as a [Code Walkthrough](code-walkthrough.md) that puts an explanation on top of the lines it is about, with findings on the code they concern.

Guided review has one standing objection: a curated tour can leave out the file that mattered, and a diff cannot leave out anything. Flight Plan answers it in two ways. The structure of both diagrams and of the walkthrough is derived from the code by the [codegraph](codegraph.md), not written by whoever writes the prose, so no writer can leave a caller out or invent one. And the walkthrough states how much of the change it covers, so a gap is visible instead of silent.

## How a review happens

1. The reviewer picks a pull request or branch in the web app, from the list the forge provides.
2. The reviewer [opens](#opening-a-review) the review target's page. Flight Plan builds the structure of the artifact from the change, saves it and shows it at once, so the reviewer can read the diagrams and the code before any prose is written. Until an agent writes it up, it stays Flight Plan's own build, with no write-up.
3. The reviewer asks the agent for a [write-up](#write-up). Flight Plan leaves the request for the review's [live agent](agent-conversation.md#live-agents), a Claude session the reviewer runs with `/flightplan:live <repository>/<target>` in a terminal they can see, and asks them to start one when none is online (the [Launch Agent dialog](#launching-the-agent)). Codex and Cursor get the prompt as one line the reviewer runs in them. The agent works with the Flight Plan review skill.
4. The agent fills in the prose through the MCP tools: each segment's title and context, labels and explanations, findings. It can change the words, never the structure.
5. The artifact opens in the web app while it is still being written, marked as drafting, and fills in as the agent works. The page shows the [progress](#progress-and-completion) at the top, and a skeleton in place of each part that is not written yet.
6. The agent marks the artifact complete. Completing it runs the checks a finished artifact must pass.
7. The reviewer reads it. Marking a waypoint or a file as reviewed hides it until its content changes, and a root code block marked as reviewed folds to its first line. When the pull request moves past the commit the artifact describes, the web app says the artifact is stale.

## Opening a review

A review target has no start page. When its page opens and Flight Plan holds no review artifact for it, `review.get` builds one from the change (`procedures/get-review/utils/opening-scaffold.ts`), saves it and returns the review. The artifact is built as the [review preferences](review-preferences.md) say: without the ignored files, and with segments on or off. A request is saved with it:

| Part of the request | Value |
|---|---|
| Configuration | The default [prompt configuration](prompt-configurations.md), or Standard when that one no longer exists. Its context code block kinds are required in the artifact. |
| Writer | The author, for the viewer's [own](#the-reviewers-page-and-the-authors-page) review target. Nobody, for someone else's. |
| Order of the Code Walkthrough | Foundations first, read by nothing: Flight Plan sorts the walkthrough itself by the [review preferences](code-walkthrough.md#order). |

The artifact of the viewer's own target starts as `authoring`, for the author to edit and mark complete. Someone else's starts as `complete`: nothing in it is required until a [write-up](#write-up) asks for it, and a complete review [catches up](#catching-up-and-deleting) with its target. No agent is started.

When the artifact cannot be built (the branch is not in the checkout, the folder is not a git repository, the change touches no files) nothing is saved, and the page says why in place of the review. The page's header then states how many files of each kind the change touches.

A review saved by another version of Flight Plan opens as a page that offers to update it, in place of the review (see [review artifact migrations](migrations.md#review-artifact-migrations)).

The New Flight Plan page (`/pr-reviews/<repository>/create`) searches the repository's pull requests and branches, and picking one opens its page, which builds the review.

The request is saved inside the review artifact, and every [write-up](#write-up) updates it. The prompt names the review target and how to reach Flight Plan. It never names the configuration, which the agent reads from Flight Plan's MCP tools, nor an order for the Code Walkthrough, which Flight Plan sorts itself.

## Write-up

The reviewer asks the agent to write a review up from the review page, choosing what it writes. `review.writeUpPlan` (`procedures/get-write-up-plan/`) gives what the choice is made from, and `review.writeUp` (`procedures/write-up-review/`) applies it.

| `review.writeUpPlan` returns | What it is |
|---|---|
| `isOffered` | Whether the review page has asked already: true once the reviewer declined (`review.declineWriteUp`), asked for a write-up, or an agent was already the review's writer |
| `agent`, `agentLabel` | The agent that writes (`claude`, `codex` or `cursor`) and its name: the setup's default agent, with its saved model and effort. The review page also uses them on a waypoint's card. With no agent set up the result is `{ kind: "no-agent", message }` instead. |
| `summary` | The choice in short, as label and value pairs: what is written up, the prompt configuration, the Code Walkthrough order and whether segments are on |
| `sections` | Context, Trace Diagram, Blast Diagram, Code Walkthrough and Findings, each with `count`, `countLabel` ("4 parts to write", "12 waypoints to check") and `isChosen` |
| `totalLabel` | What the chosen sections add up to: "5 parts to write and 12 waypoints to check", or "Nothing to write" |
| `configurations`, `configurationId` | Every prompt configuration with its label, what it is best for, its description and its note, as the setup offers them, and the chosen one |
| `walkthroughOrder` | The chosen [walkthrough order](code-walkthrough.md#order) |
| `isSegmented` | Whether the review is split into segments |

A count is of the parts still unwritten that choosing the section would require: the context of each segment (the first alone with segments off), the labels and descriptions of the Trace Diagram and its title, the files of the Blast Diagram to assess, the titles and readings of the waypoints. Findings count the waypoints the agent reads for them. The plan is asked for again with the sections the reviewer ticks, and its counts and labels follow. Unless the reviewer chose otherwise, the sections are those of the last write-up of this review, or else those the Write-ups of the [review preferences](review-preferences.md) mark Always; the configuration is the review's, or else the default; the order is the last write-up's, or else the preference's.

The review page opens the [Write-up Dialog](../DESIGN.md#write-up-dialog) on its own while `isOffered` is false: the first time a review opens, right after Flight Plan built it. It shows the choice in short, and "Configure" shows the inputs. "Not now" calls `review.declineWriteUp` (`procedures/decline-write-up/`), which keeps `isWriteUpDeclined` with the request, so the page does not ask again. With no agent set up the dialog is not shown. "Explain this review" in the Settings Menu of the review page opens it again at any time.

`review.writeUp` takes the sections, the configuration, the order and whether segments are on. It refuses, as data with the field it is about, an empty choice, a configuration that no longer exists and a review with no agent set up. Otherwise it sets segments on or off, rebuilding the artifact at its commits when the choice differs from the stored one ([segments off](review-artifact.md#segments-off)), requires the context code blocks of the configuration and every node of the chosen sections (a node once required stays required), stores the choice with the request as `writeUp`, makes the artifact drafting and leaves it for the live agent: started, or the one line to run in Codex or Cursor. The prompt names the chosen parts, and asks the agent to check every waypoint for findings or to write none. When everything chosen is already written, the agent is asked for nothing and the answer says so. The page sorts the Code Walkthrough by the order in `writeUp` over the preference.

## Progress and completion

While a review artifact is drafting, the page states how far the writing is: how many parts need nothing more, out of every part the agent writes. A part is what the MCP tools hand out as unwritten work: a segment's context and title, a waypoint, a Trace Diagram node, the title and description of a Trace Diagram and a file of the Blast Diagram that the change reaches. Only [required](review-artifact.md#required-nodes) parts are counted, so a section the configuration turned off is not counted.

The page also says who is writing:

| State | When | What the page says |
|---|---|---|
| `writing` | The review's live agent is online, or the agent the reviewer started for Codex or Cursor has written a part | Who is writing, and that the code can be read meanwhile |
| `waiting` | The live agent is offline, or Codex or Cursor has written nothing yet | That the agent writes once it is online, or that the line is to be run in Codex or Cursor, with a button that copies it again |

A part that is not written is drawn as a skeleton while an agent writes it, and as plain "not written" while the live agent is offline.

Outside those states, each section of a segment that has parts to write and none written up says "Not explained yet" beside its heading: the Context with no context, a Trace Diagram with no title, no description and no label, a Blast Diagram with files to assess and none assessed, a Code Walkthrough with waypoints and no title or reading. The page data carries it per segment as `writeUpNotices` (`procedures/get-review/utils/write-up-notices.ts`), one label or `null` per section. A section with nothing to write, such as a segment with no Trace Diagram, says nothing.

When the agent completes the artifact, the page that watched it being written raises a browser notification with the title of the review target, and says the same in a toast. It fires whether or not the page has focus, and a click on it brings the page to the front. The browser's permission is asked for when the reviewer asks the agent for a write-up. A page opened on a review that is already complete raises nothing.

## Launching the agent

The review page asks the reviewer to start the review's [live agent](agent-conversation.md#live-agents) with the [Launch Agent Dialog](../DESIGN.md#launch-agent-dialog), only while no agent is online for the review (`review.liveAgent`, asked every 5 seconds):

- when a review opens whose write-up was offered already (`isOffered`). On the first open the Write-up Dialog comes first, and the Launch Agent dialog follows once the reviewer presses Explain; after Not now it does not;
- when the agent was stopped because the review sat idle, so the reviewer finds the dialog when they come back to the page;
- when the reviewer asks the agent for anything: a write-up from the Write-up Dialog or a part's "Write up" action, a chat message, an answer, Ask about a selection, or publishing to Claude.

Closing it keeps it closed until the next of these, or the next time the review opens. The agent's state in the top bar of the review page, "Claude offline", opens it again. The dialog offers "Open a terminal for me" where Flight Plan can open one (`review.openAgentTerminal`, macOS only), and always the command to copy, `/flightplan:live <repository>/<target>`, for an agent the reviewer starts themselves.

## The reviewer's page and the author's page

A review target has one page, `/pr-reviews/<repository>/<target>`. What it shows depends on whose review target it is.

A review target is the viewer's **own** when it is a branch with no pull request, or a pull request written by the user signed in to the code host. Where the signed-in user is not known, as with local git, a pull request is someone else's.

| | No review artifact | Not uploaded | Uploaded |
|---|---|---|---|
| The viewer's own | Built on open, then the author's page | The author's page | The author's page, with the review status, the reviewers, the conversation and Submit review |
| Someone else's | Built on open, then the reviewer's page | The reviewer's page | The reviewer's page |

The **author's page** is where a Flight Plan is edited: its segments, its contexts, its diagrams and its Code Walkthrough. Only the viewer's own Flight Plan can be edited. Until it is uploaded its header shows the review target, the label "Your Flight Plan" and the Settings Menu, and the page has no review status, no reviewers, no comments and no Submit review.

A Flight Plan is **uploaded** once it has been published, to the pull request description or as a Claude artifact. The author's page offers Share only when the artifact is `complete`. While it is not, the header holds "Mark as complete", which makes it `complete`.

### Changed files and side panels

Panels dock at both edges of the reviewer's page and the author's page.

At the left is the **changed files explorer**. It lists the changed files of the review target as a tree, sorted the way an editor sorts one: folders first, then files, each by name, with a folder that only holds one folder merged into it, such as `src/pokedex`. Each file shows the icon of its language or framework, a mark for whether the change added, modified or deleted it, the kinds of [findings](code-walkthrough.md#findings) its waypoints carry, and how many of its waypoints are reviewed. Clicking a file goes to its file section in the Code Walkthrough, and the file being read is highlighted. A changed file the Code Walkthrough leaves out is listed as not covered and leads nowhere. Its Filter button opens the same [filter](code-walkthrough.md#filters) as the Review Navigator's Filter, with no key of its own. The filter and the Reviewed tick narrow the explorer as they narrow the walkthrough: the files they hide leave the tree, the explorer counts them, and while anything is ticked it names the ticks with a way to clear them.

At the right is the **activity bar**, with a button for the section rail and one for [Chat](agent-conversation.md#chat). The button of the panel that shows is pressed; pressing it again hides the panel, and pressing the other swaps them. The Chat button carries the mark of the agent the setup names, or a speech mark when none is set up.

The explorer and the right panel can be made wider or narrower by dragging their inner edge, and double-clicking the edge gives a panel its own width back. The section rail and Chat each keep their own width. The widths are kept in the browser, so the page opens with them again. Each panel can be hidden and shown again: the explorer with Ctrl+E, the section rail with Ctrl+A and Chat with Ctrl+C, or with the hide control at the top of each panel. Ctrl+C is left to copying while text is selected. The page opens with the explorer and the section rail shown. A published Flight Plan keeps the section rail at the left, with a stop per file, and has no explorer.

### Review Navigator

The **[Review Navigator](review-navigator.md)** is the toolbar at the foot of the page, on the reviewer's page, the author's page and a published Flight Plan. It holds the controls of the section that fills the screen, each with a key: Jump to (W), Back (A) and Next (D) on every section, and the controls of the section itself, such as zooming a diagram or stepping through the waypoints of the Code Walkthrough and marking them reviewed.

### Comments and the review

The reviewer's page shows the pull request's [discussion](forge.md#discussion-and-reviews) and takes part in it. A branch without a code host has none of this.

| Part | Where it is | What it does |
|---|---|---|
| Comment thread | In the code, under the last line it is about, with its lines marked | Shows the comments. Takes a reply, and resolves or reopens the thread. A resolved thread is folded until it is shown. |
| Conversation | At the end of the page | Lists the comments on the pull request as a whole and each submitted review with its verdict, oldest first. A thread the page cannot place, because its line is outdated or its file is not in the Flight Plan, is listed here with its file and lines. |
| Comment box | Under a line, opened by the + in its gutter | Takes a comment on that line. A shift-click on the + of another line of the same side stretches it to a range. Removed lines take comments too. |
| Submit review | In the sign band | Lists the pending comments, takes a summary and a verdict, and sends them to the code host as one review. |
| Reviewers | In the sign band | Requests a reviewer found by a search, removes a request that is still open, and asks a reviewer who answered for another review where the code host can. |

A comment on a line is written in a composer under that line. The + of a line opens it, and so does "Add comment" on selected code, which takes the selected lines as its range. The composer sends the comment one of two ways. "Add single comment" sends it to the code host at once. "Add to review" keeps it **pending** until a review is submitted: it is kept by Flight Plan and nobody else sees it. A pending comment can be discarded, from its thread or from the Submit review panel. A comment on the pull request as a whole, a reply and a resolution are sent at once.

A pending comment belongs to the commit the Flight Plan describes, and the review is submitted against that commit. When the Flight Plan is rebuilt for a later commit, a pending comment written before it is marked as written against an earlier commit, and no review can be submitted until it is discarded.

A comment can be put on a line the change adds or removes, and on the three lines around a change, because the code host holds comments on no other line.

Every comment is written in the text editor and sent as Markdown.

When the code host refuses something, the page shows the code host's own reason and keeps what was written.

### Publishing as a Claude artifact

"Publish as a Claude artifact" in Share publishes a **published copy** of the Flight Plan: one page that holds the whole review artifact and needs neither Flight Plan nor the repository to be read.

Flight Plan builds the page and an agent uploads it, because only a Claude session has the tool that publishes an artifact:

1. Flight Plan writes the page into its data directory (see [data storage](data-storage.md)): the page, the app that draws it, its style, the review as data, and the review artifact itself as the file `flight-plan.json`.
2. It sends the review target's [agent conversation](agent-conversation.md) a message that asks the agent to publish that folder as it is, and starts Claude when no session can take it. The message shows in Chat like any other.
3. The agent publishes the page with its Artifact tool and reports the artifact's address with the `record-publication` tool. From then on Share shows when it was published and a link to it. Until then the Share button and its Publish button show a spinner and "Publishing…", and nothing else can be published: while the agent Flight Plan started is running, or for ten minutes when a session the reviewer started took the request.

The first time a Flight Plan is published its address is not known until the artifact exists, so the agent publishes twice: once to get the address, and once more after Flight Plan has written the link back to itself into the page. Publishing again updates the same artifact in one step, so its address stays the one already shared. When no agent can be asked, Share says why and nothing is recorded.

The published copy is the reviewer's page, read-only, drawn from the review artifact alone:

| In the published copy | Left out |
|---|---|
| Every segment with its context, its Trace Diagram, its Blast Diagram and its Code Walkthrough | The pull request's status, its author and its reviewers |
| Every [CodeLink](review-artifact.md#codelink), with the code it points at | Comments, the conversation and the review draft |
| The code of every file the review artifact holds: the changed files and the files the diagrams connect to them | The reviewed marks made in Flight Plan |
| Section navigation and waypoint stepping | Chat, and "Ask the agent" on selected code: a Claude artifact has a chat of its own |
| Marking waypoints, files and root code blocks as reviewed, and showing the reviewed ones again | |

Its header shows the review target's title and the label "Published Flight Plan". The Review Toggles, Mark as reviewed and the Reviewed tick of the filter work as they do on the reviewer's page. The marks are kept in the browser's `localStorage`, under a key the published review names, so they stay with that reader and that browser across a reload, and a storage the browser blocks or that holds something unreadable counts as no marks. The page works out what the marks make reviewed with the same calculation the backend runs, from the outline of every file the published review carries: its waypoints and root code blocks with their fingerprints. The other controls that need Flight Plan stay where they are on the reviewer's page: Share, Submit review, the Options Menu, the ticks of the waypoint filter other than Reviewed, the comment on a line and "Add comment" on selected code. Using one opens a dialog that says it is only available in Flight Plan and how to start Flight Plan: `npx @kidlat-dakila/flightplan@latest`, or `npm install -g @kidlat-dakila/flightplan@latest` once and then `flightplan`, each with a button that copies it.

### Downloading a published Flight Plan

The published copy has a link in its header, "Download to Flight Plan", which opens the download page of the reader's own Flight Plan: `/artifact/claude/download`, with the artifact's address, the repository and the review target in its query.

1. The page asks the review target's agent conversation to fetch `flight-plan.json` from the artifact and to copy it to a path in Flight Plan's data directory. It starts by itself when the review target has no Flight Plan here. When it has one, the page says that downloading replaces it and waits for "Replace and download".
2. The agent fetches the file with its Artifact tool, copies it, and calls the `record-import` tool. Flight Plan reads the file from that path, checks that it is a Flight Plan, and stores it as the review target's Flight Plan. A file saved by another version of Flight Plan is stored as it came, and its page offers to update it.
3. The page waits, and opens the review page once the Flight Plan is stored.

The repository must be one the reader's Flight Plan follows, under the same name. When no agent can be asked, or the agent stops before the Flight Plan is stored, the page says so and offers to try again.

A Flight Plan made for a branch is stored under the branch, not under a pull request. Marking it as complete opens a dialog that lists the viewer's open pull requests that have no Flight Plan, with the pull request of the same branch chosen. Choosing one moves the Flight Plan to that pull request: it is stored under the pull request and takes its title, its reviewed marks, pending comments and publications move with it, the page moves to the pull request's address, and the branch has no Flight Plan any more. "Complete without a pull request" completes it where it is. The chat with the agent stays with the branch.

## Catching up and deleting

A review catches up with its target on its own. When the page opens on a stored review whose target has moved past the commit it describes, and no agent is writing it, Flight Plan pulls the branch, builds the review artifact again at the new head and keeps what was written for code that has not changed since. What is new is left unwritten, with its hints, for the next [write-up](#write-up), which writes up only what is missing. The review keeps its status, its choice of segments, its context code block kinds and its request.

Pulling fetches the branch from `origin` and fast-forwards the local branch. A repository with no remote is built as it is. When the pull fails, or the build cannot be made, the review stays as it is and the page goes on saying it is out of date.

What a refresh keeps is decided part by part, by comparing the code as the two artifacts hold it, diff marks included:

| Part | Kept when |
|---|---|
| A waypoint's title, reading, core change note and findings | The lines of its declaration are the same |
| A Trace Diagram node's label, description, trigger labels and block labels | The lines of its code block are the same |
| A File Section's waypoint order | The whole file is the same |
| A segment's title, context, file order and the impacts of its Blast Diagram | The segment has the same changed files and every one of them is the same |
| The title and the description of a Trace Diagram | The same, and the diagram has the same edges and as many nodes |

A part is not kept when a code link in it no longer resolves, or points at lines of a file that changed.

The Settings Menu of the review page holds the review's actions above the settings: View pull request, Explain this review and Delete, which deletes the review artifact and goes back to the repositories. Opening the review target again builds a new one.

## Who writes what

| Part | Written by |
|---|---|
| Structure: which nodes exist, how they connect, which files and lines the walkthrough covers | Flight Plan, from the code |
| Everything a reader could check against the repository: line ranges, diff marks, the code behind a link | Flight Plan, resolved when the artifact is written |
| Prose: context, labels, explanations, findings, impact types and reasons | The agent |
| The pull request's title | Copied from the forge, never rewritten |
| How the agent writes each part | The active [prompt configuration](prompt-configurations.md) |
