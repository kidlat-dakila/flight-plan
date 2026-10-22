---
name: live
description: Use when the reviewer runs /flightplan:live <repository>/<target> to keep this session serving one Flight Plan review. Waits on the review's listening stream for parts to write up and chat messages, does each one, keeps Flight Plan told that the session is online, and goes back to waiting until the reviewer closes the terminal.
argument-hint: <repository>/<target>
allowed-tools: mcp__plugin_flightplan_flightplan__* Bash(curl -sN *)
---

# Serve a Flight Plan review live

The reviewer reads a review in Flight Plan's web app, and this session is the
agent behind it. Flight Plan asks for work on the review's listening stream:
parts of the review to write up, and the reviewer's chat messages and answers.
You do each one and go back to listening. You keep doing that until the reviewer
closes this terminal.

**The review comes from the argument:** `$ARGUMENTS`. It is
`<repository>/<target>`, such as `storefront/pr-412`: everything before the last
`/` is the `repositoryName`, and the rest is the `targetId`, `pr-<number>` for a
pull request or `branch-<name>` for a branch. Every Flight Plan tool takes both.
If the argument is missing or has no `/`, ask the reviewer in this terminal which
review to serve, and wait for the answer.

## Stay online

Flight Plan shows the reviewer whether an agent is online for their review.
Every call to a Flight Plan tool counts. When you go a while without one, say
while you read files, search the code or think something through, call `ping`
with the review's `repositoryName` and `targetId` at least every 5 seconds.
While the listen command waits, the open connection counts, so do nothing else.

## Start

1. Call `ping`. If it refuses the review, tell the reviewer in this terminal what
   it said, and stop.
2. Call `nodes` with `unfilled: true`. If it lists parts that are required and
   unwritten, write them up as the `flightplan:review` skill says, before you
   listen. An earlier session may have stopped halfway.
3. Listen.

## Listen

Run the listen command the tools give you, in the foreground, with a timeout of
10 minutes:

```
curl -sN "<server>/api/<repositoryName>/<targetId>/live/agent"
```

The `ping` result and the other tools' results name the exact command. It waits
until Flight Plan has something for you, prints it as one server-sent event and
exits. Its output is one of these:

- **`event: work`**: the reviewer's messages, answers to your questions, or a
  request from Flight Plan, such as a part to write up, a Flight Plan to publish
  or one to fetch. Do all of it, then listen again.
- **`event: idle`**: nothing came for a while. Listen again at once.
- **Nothing, or an error:** Flight Plan restarted or is not running. Wait a few
  seconds, call `ping`, and listen again. If `ping` keeps failing, tell the
  reviewer in this terminal that Flight Plan cannot be reached, and stop.

Never run the listen command in the background, and never two at a time. The
stream hands each request to exactly one listener.

## Do the work

- **A part to write up**, or a whole review: follow the `flightplan:review`
  skill. It says how to read the change, how the reviewer wants it written, and
  how to finish with `complete`.
- **A chat message:** answer it with `send-message`. When it asks you to change
  the review, change it through `read`, `nodes` and `update-nodes`, then say what
  you changed. The reviewer reads only what you send through Flight Plan, never
  this terminal.
- **Something you need the reviewer to decide:** ask with `ask-questions`, then
  listen. The answers come on the stream like any other work.
- **A Flight Plan to publish or to fetch:** do what the request says, then call
  `record-publication` or `record-import`.

When everything in a packet is done, listen again. Do not end your turn between
packets: the reviewer is waiting on the stream, not on you.
