Flight Plan turns a change into an **ordered reading order**: prose beside the
code it explains, with the code *referenced* by path and line rather than pasted.
Nothing here holds a copy of your source, so a walkthrough cannot quietly drift
out of date — and when the code does move, it says so.

There are four things it makes, and one panel that reads all of them.

## Reviewing a pull request

**Source Control → Review Flight Plans.** Once Flight Plan knows how to reach
your code host, it lists the pull requests you were asked to review and the ones
you opened. A badge says whether a walkthrough is already stored for it on this
machine.

Out of the box it uses plain `git`, which cannot list pull requests, so the list
holds the branches you add by name instead. See *How Flight Plan reaches your
code host* below.

Click one. If it has a walkthrough the panel opens and you read it. If it does
not, the panel says so and gives you a prompt to copy — paste that into Claude
Code, Codex, or whichever assistant you use, and it writes one.

Four buttons on the panel's title bar decide what the list holds. **Label** and
**Review** are multiple choice: pick as many as you like, and a pull request has
to satisfy all of them, which is how the hosts themselves combine them.
**Include your pull requests** is a yes or no. Picking nothing in a filter means
that filter is not asking anything.

**The review options belong to your host**, because they do not translate.
GitHub offers its own eight — no reviews, review required, approved, changes
requested, reviewed by you, not reviewed by you, awaiting review from you, or
from you or your team. GitLab offers assigned to you, awaiting your review,
opened by you, and not a draft. Bitbucket's query language expresses none of
them, and plain `git` has no pull requests to filter, so on those the button
says so and offers to take you to Setup rather than showing a picker where
nothing works.

**+** adds one by hand — a pull request link, whatever the filters say, or a
branch name when Flight Plan is using plain `git`.

The fourth button, **add manually**, takes a pasted link and keeps that pull
request in the list whether or not the filters match it, which is what you want
when a colleague sends you one directly. Its row carries a pin icon and comes
off from the right-click menu. A link from another repository is refused rather
than added somewhere it does not belong, and a pull request that has since been
merged or closed drops out: the list is open pull requests, and adding one by
hand does not change that.

None of this is written to `.vscode/settings.json`. Your filters and your added
pull requests belong to the folder you are in and stay on your machine, so
nothing here becomes a file the rest of the team pulls.

The assistant will **ask you what kind of walkthrough you want** before it
starts: by flow, by file, by concern, or findings first. Answering in one word is
enough; it is the question that decides whether the result is worth reading.

## Writing one for your own change

The same thing, from the other side. Ask your assistant:

```
/flightplan:review owner/repo#1234
```

It reads the diff and the files at the head commit, asks how you want it
organised, writes the walkthrough, and opens it in VS Code for you to read.

Nothing is posted to the pull request. What it wrote is stored on this machine.

To bring an existing one up to date after you push more commits, use the same
skill again — there is one skill for a pull request, and what to do with the
walkthrough it already has is carried by the prompt rather than by a second
skill. The walkthrough's editor title bar has buttons that copy the right prompt
for you: one refreshes and keeps your edits, one starts over and does not.

## Planning work before you write it

A plan is prose beside code that **does not exist yet**. There is no skill
for it: ask your assistant in plain words, and name the tools.

```
Use the Flight Plan MCP tools to write an implementation plan for
acme/storefront. Call get-instructions first.
```

Instead of referencing code, a plan proposes it, and says exactly where it goes:
a path plus a position. The panel then splices the proposal into the real file
and shows it as a diff — proposed lines marked `+`, superseded lines marked `−`,
and no line number on the proposed ones, because they do not have one yet.

Plans resolve against **the working tree on your current branch**, not a commit,
because a plan is about code you are about to write.

They are listed under **Explorer → Flight Plans**, newest first, with the branch
each was written against beside it.

- **Group by branch** puts them under the branch instead of in one list. The
  branch you last wrote a plan on stays at the top; plans with no recorded
  branch are filed last.
- **Archive** a plan you are done with and it leaves the view. **Show archived
  plans** brings them back, marked, so you can unarchive one. Archiving changes
  nothing about the document: it is a note beside your plans, not something
  written into your prose, so an assistant rewriting the plan cannot undo it.

Both toggles are remembered, so the view opens as you left it.

Once the code exists, turn the plan into a walkthrough rather than maintaining
both.

## Reading a walkthrough

The panel is two columns: prose on the left, code on the right. Scroll the prose
and the code follows. Drag the divider between them to change the split; it
remembers.

- **Waypoints** are the numbered steps. Each opens with **What** and **Why** —
  what the code *is*, and the reason a diff cannot show you.
- The code panel shows the **whole file**, with the cited lines focused and the
  rest dimmed. You can read above and below without leaving.
- Lines the change **adds** are marked from the pull request's own diff, never by
  hand.
- **Copy** on the code panel takes the code. **Copy** on a waypoint takes a
  reference to it you can paste to an assistant.
- The **open** button goes to the code: your editor when the file on disk is the
  file the walkthrough was written against, and the pull request's diff when it
  is not.
- Select any text and a button offers a reference to exactly those lines.
- A badge says **excerpt** when a file was too long to show whole, **moved** when
  a range shifted and was corrected, and **anchor lost** when the code it was
  written about is gone. That last one is the point of the whole design: it tells
  you rather than showing you the wrong lines.
- A notice appears when the pull request has moved since the walkthrough was
  written, with a prompt to bring it up to date.
- **Coverage** says how many changed files the walkthrough actually covers, so a
  curated tour cannot quietly skip the file that mattered.

## Diagrams

A document can carry a diagram under a `## Diagram` heading. It is the **map**;
the waypoints are the tour.

A diagram is drawn as a **call stack**: it starts where a person or a system does
something and follows the calls down to the change, including the steps the
change never touches. Cards that *are* the change are marked `changed`; the rest
are context. That is the part a diff cannot give you — what calls this, and what
called that.

- **Drag** to pan, **scroll** to zoom.
- **Hover** a card for its description and its code.
- **Click** a card to jump to the waypoint that explains it.
- The buttons zoom, fit, recentre without changing the zoom, and go **full
  screen** — where the board fills the panel and the code panel floats over it.
  Escape leaves.

## How Flight Plan reaches your code host

Out of the box it uses plain `git` and talks to no host at all. That reads
everything in your checkout — a file at a commit, a branch's diff against trunk,
and any walkthrough written on this machine — and it needs no CLI, no token and
no network.

What it cannot do without a host: list pull requests, filter by review state or
label, or link into a diff on the web. None of those exist outside a code host.

Open the Setup tab and pick one to turn them on. Each tab says how to get what
it needs. You can change it whenever you like, from the button on the step or
from the tab already in use.

**One host at a time.** If the folder's remote is on a different host from the
one you chose, the list says so and points at Setup, rather than showing you
nothing and leaving you to work out why.

**In `git` mode the review list holds branches you add by name**, since nothing
local knows which branches are under review. Add one with the **+** button. If
it is not in your checkout yet, Flight Plan offers to fetch it.

## The skill

One, installed where your assistant will find it. It is plain Markdown and
**you are meant to edit it**: reading style is personal, and this is the
instructions, not the program.

- `/flightplan:review` — write a walkthrough for a pull request, or refresh one
  that has gone out of date.

Plans have no skill; ask for one by naming the Flight Plan MCP tools, as shown
above.

Reinstalling replaces the skill, and the Setup tab lists anything you have
changed before it does.

## The tools, and why you never call them

Your assistant reaches Flight Plan through its MCP tools, for walkthroughs and
plans. You do not call them; your assistant does.

Two rules they enforce, so a skill cannot forget:

- **Starting over is never silent.** `start` will not replace a walkthrough that
  exists unless the assistant is told to start over, because that would discard
  whatever you changed in it.
- **A write is checked before it is stored.** If a path, a line range or an
  anchor does not hold, nothing is written and the assistant is told what to fix.
  This is why a walkthrough that opens is a walkthrough that resolves.

## Settings

**Flight Plan: Open Settings**, or the Setup tab.

- **Forge** — how Flight Plan reaches your code host: plain `git`, the GitHub
  CLI, or GitHub, GitLab or Bitbucket Cloud with a token. `git` is the default
  and needs nothing installed. The Setup tab explains how to get each one and
  which scopes it needs; tokens go in your operating system's keychain, never in
  a settings file.
- **Forge base URL** — for a self-hosted GitHub Enterprise or GitLab instance.
  Leave it empty for the provider's cloud host. The repository's remote has to
  be on this host, or Flight Plan says so rather than guessing.
- **Bitbucket email** — Bitbucket authenticates your Atlassian account email
  alongside its API token. The token itself goes in the keychain.
- **Plugin location** — where the skills and the tool registration are installed.
- **Server port** — the MCP server is bound to `127.0.0.1`. Leave it at `0` to
  let the system choose. Changing it means reconnecting every agent, because they
  store the whole address.
- **Pull request query** and **limit** — what the review list shows.

## Commands

All under **Flight Plan** in the command palette.

- **Open Setup** — this view.
- **Open Settings**, and **Remove Agent Tooling**.

## When something is wrong

- **"No such session"**, or the assistant says a tool does not exist. The server
  restarted, usually because the extension updated. Reconnect the agent, and
  check the Setup tab: if the installed tooling is an older version than the
  extension, reinstall it and restart the agent.
- **A walkthrough says a file does not exist.** It is being read at the wrong
  commit, or the path moved. The document's `meta.head` is what it is read at.
- **The review list is empty.** Out of the box Flight Plan uses plain `git`,
  which cannot list pull requests — nothing local knows which branches are
  under review. Either add a branch by name, or open the Setup tab and choose
  how Flight Plan should reach your code host. The list says which of these it
  is.
- **The list says the repository is on the wrong host.** The choice in Setup is
  one host at a time, and this folder's remote is on another. Change it in
  Setup, or open a repository on the host you configured.
- **A walkthrough opens but says nothing has been checked.** Read with plain
  `git`, so there are no diff marks, no coverage and no staleness check. Fetch
  the branch to read the code from your checkout, or configure a host to get
  the rest.
- **Nothing works while VS Code is closed.** The MCP server is this extension's
  child process. That is the trade for having one server instead of one per
  agent.
