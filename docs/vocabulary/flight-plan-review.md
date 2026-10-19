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
2. The reviewer makes a [review request](#review-request) on the review target's page.
3. Flight Plan builds the structure of the artifact from the change and saves it with the request. The page opens the artifact at once, marked as drafting, so the reviewer can read the diagrams and the code before any prose is written. At the same time Flight Plan starts the chosen coding agent with a prompt. An agent Flight Plan cannot start itself, Codex or Cursor, gets the prompt as one line the reviewer runs in it. A review built without an agent stays Flight Plan's own build, with no write-up. The agent works with the Flight Plan review skill.
4. The agent fills in the prose through the MCP tools: each segment's title and context, labels and explanations, findings. It can change the words, never the structure.
5. The artifact opens in the web app while it is still being written, marked as drafting, and fills in as the agent works. The page shows the [progress](#progress-and-completion) at the top, and a skeleton in place of each part that is not written yet.
6. The agent marks the artifact complete. Completing it runs the checks a finished artifact must pass.
7. The reviewer reads it. Marking a waypoint or a file as reviewed hides it until its content changes, and a root code block marked as reviewed folds to its first line. When the pull request moves past the commit the artifact describes, the web app says the artifact is stale.

## Review request

A review request is what the reviewer makes to have Flight Plan build a review artifact and choose who writes its prose. A review target with no review artifact shows the request form in place of the review. It holds three choices:

| Choice | Content |
|---|---|
| Configuration | The [prompt configuration](prompt-configurations.md) the agent writes with. The default configuration is listed first and selected. |
| Order of the Code Walkthrough | One of the [orders](code-walkthrough.md#order), or the reviewer's own instruction. |
| Agent | A coding agent set up in Flight Plan, the model it runs and the effort it works at, or no agent. An agent Flight Plan can start is started; for one it cannot start, the reviewer gets one line to run in it, and the model and effort are that agent's own. |

While a review target has no review artifact, the page's header also states how many files of each kind the change touches.

The request is saved inside the review artifact, so the choices are never lost. The prompt names the review target, how to reach Flight Plan and the order of the Code Walkthrough. It never names the configuration: the agent reads that from Flight Plan's MCP tools.

## Progress and completion

While a review artifact is drafting, the page states how far the writing is: how many parts need nothing more, out of every part the agent writes. A part is what the MCP tools hand out as unwritten work: a segment's context and title, a waypoint, a Trace Diagram node, the description of a Trace Diagram and a file of the Blast Diagram that the change reaches. Only [required](review-artifact.md#required-nodes) parts are counted, so a section the configuration turned off is not counted.

The page also says who is writing:

| State | When | What the page says |
|---|---|---|
| `writing` | The agent Flight Plan started is running, or the agent the reviewer started has written a part | Who is writing, and that the code can be read meanwhile |
| `waiting` | The reviewer starts an agent Flight Plan cannot start, and nothing is written yet | That the line is to be run in that agent, with a button that copies it again |
| `stopped` | The agent Flight Plan started is not running and the artifact is not complete | That it stopped, the reason when it could not start, and that a message in Chat starts it again |

A part that is not written is drawn as a skeleton while the state is `writing` or `waiting`, and as plain "not written" once it is `stopped`.

When the agent completes the artifact, the page that watched it being written raises a browser notification with the title of the review target, and says the same in a toast. It fires whether or not the page has focus, and a click on it brings the page to the front. The browser's permission is asked for when the reviewer makes a review request. A page opened on a review that is already complete raises nothing.

## The reviewer's page and the author's page

A review target has one page, `/pr-reviews/<repository>/<target>`. What it shows depends on whose review target it is.

A review target is the viewer's **own** when it is a branch with no pull request, or a pull request written by the user signed in to the code host. Where the signed-in user is not known, as with local git, a pull request is someone else's.

| | No review artifact | Not uploaded | Uploaded |
|---|---|---|---|
| The viewer's own | The form that creates a Flight Plan: an agent draft, the structure alone, or empty | The author's page | The author's page, with the review status, the reviewers, the conversation and Submit review |
| Someone else's | The review request form | The reviewer's page | The reviewer's page |

The **author's page** is where a Flight Plan is edited: its segments, its contexts, its diagrams and its Code Walkthrough. Only the viewer's own Flight Plan can be edited. Until it is uploaded its header shows the review target, the label "Your Flight Plan", Chat and the Options Menu, and the page has no review status, no reviewers, no comments and no Submit review.

A Flight Plan is **uploaded** once it has been published, to the pull request description or as a Claude artifact. The author's page offers Share only when the artifact is `complete`. While it is not, the header holds "Mark as complete", which makes it `complete`.

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

Its header shows the review target's title and the label "Published Flight Plan". The Review Toggles, Mark as reviewed and the Reviewed tick of the filter work as they do on the reviewer's page. The marks are kept in the browser's `localStorage`, under a key the published review names, so they stay with that reader and that browser across a reload, and a storage the browser blocks or that holds something unreadable counts as no marks. The page works out what the marks make reviewed with the same calculation the backend runs, from the outline of every file the published review carries: its waypoints and root code blocks with their fingerprints. The other controls that need Flight Plan stay where they are on the reviewer's page: Share, Submit review, the Options Menu, the ticks of the waypoint filter other than Reviewed, the comment on a line and "Add comment" on selected code. Using one opens a dialog that says it is only available in Flight Plan and how to start Flight Plan: `npx @kidlat-dakila/flightplan`, or `npm install -g @kidlat-dakila/flightplan` once and then `flightplan`, each with a button that copies it.

### Downloading a published Flight Plan

The published copy has a link in its header, "Download to Flight Plan", which opens the download page of the reader's own Flight Plan: `/artifact/claude/download`, with the artifact's address, the repository and the review target in its query.

1. The page asks the review target's agent conversation to fetch `flight-plan.json` from the artifact and to copy it to a path in Flight Plan's data directory. It starts by itself when the review target has no Flight Plan here. When it has one, the page says that downloading replaces it and waits for "Replace and download".
2. The agent fetches the file with its Artifact tool, copies it, and calls the `record-import` tool. Flight Plan reads the file from that path, checks that it is a Flight Plan, and stores it as the review target's Flight Plan.
3. The page waits, and opens the review page once the Flight Plan is stored.

The repository must be one the reader's Flight Plan follows, under the same name. When no agent can be asked, or the agent stops before the Flight Plan is stored, the page says so and offers to try again.

A Flight Plan made for a branch is stored under the branch, not under a pull request. Marking it as complete opens a dialog that lists the viewer's open pull requests that have no Flight Plan, with the pull request of the same branch chosen. Choosing one moves the Flight Plan to that pull request: it is stored under the pull request and takes its title, its reviewed marks, pending comments and publications move with it, the page moves to the pull request's address, and the branch has no Flight Plan any more. "Complete without a pull request" completes it where it is. The chat with the agent stays with the branch.

## Rebuilding and deleting

The Options Menu of a review artifact holds three actions on it.

| Action | What it does |
|---|---|
| Update the Flight Plan | Pulls the branch, builds the review artifact again at its latest commit, and keeps what was written for code that has not changed since the commit the artifact was pinned to. The agent writes the rest. |
| Regenerate from scratch | Pulls the branch, builds the review artifact again and keeps nothing. The agent writes all of it. |
| Delete | Deletes the review artifact. The page shows the request form again. |

On the author's page the Options Menu holds Delete and neither of the other two: there the Flight Plan is written by hand, and a rebuild would hand it to the agent.

Update and Regenerate open the request form in a dialog, set to the choices of the last request. Choosing another configuration in an update is a total rewrite, and the form says so under the configuration: nothing is kept, because another configuration writes every part differently.

Pulling fetches the branch from `origin` and fast-forwards the local branch. A repository with no remote is built as it is. When the pull fails, nothing is built: the review artifact stays as it is and the dialog says why the pull failed.

What an update keeps is decided part by part, by comparing the code as the two artifacts hold it, diff marks included:

| Part | Kept when |
|---|---|
| A waypoint's title, reading, attention note and findings | The lines of its declaration are the same |
| A Trace Diagram node's label, description, trigger labels and block labels | The lines of its code block are the same |
| A File Section's title, summary and waypoint order | The whole file is the same |
| A segment's title, context, walkthrough intro, file order and the impacts of its Blast Diagram | The segment has the same changed files and every one of them is the same |
| The description of a Trace Diagram | The same, and the diagram has the same edges and as many nodes |

A part is not kept when a code link in it no longer resolves, or points at lines of a file that changed. The order of the File Sections is kept only when the request asks for the same order. An update that leaves nothing to write keeps a complete artifact complete and starts no agent.

## Who writes what

| Part | Written by |
|---|---|
| Structure: which nodes exist, how they connect, which files and lines the walkthrough covers | Flight Plan, from the code |
| Everything a reader could check against the repository: line ranges, diff marks, the code behind a link | Flight Plan, resolved when the artifact is written |
| Prose: context, labels, explanations, findings, impact types and reasons | The agent |
| The pull request's title | Copied from the forge, never rewritten |
| How the agent writes each part | The active [prompt configuration](prompt-configurations.md) |
