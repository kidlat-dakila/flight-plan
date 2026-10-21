# Agent conversation

## Definition

An agent conversation is the exchange between a coding agent and the reviewer about one review target, a pull request or a branch. The agent reaches the reviewer through Flight Plan's MCP tools, the reviewer answers in the web app, and Flight Plan carries each side's words to the other.

Each review target has one conversation and at most one agent session that Flight Plan runs for it. Several review targets can each have a session at the same time.

## What a conversation holds

A conversation is a **journal**: an ordered list of events, each numbered by its sequence. Everything about the conversation is worked out from the journal, so nothing is lost while an agent starts, stops or restarts.

| Event | Who adds it | Meaning |
|---|---|---|
| Reviewer message | The reviewer | Something the reviewer wrote, with the code reference it is about, if any |
| Agent message | The agent | Something the agent wrote to the reviewer |
| Question batch | The agent, or Flight Plan for a permission request | One question or several, answered together |
| Answers | The reviewer | The answers to one question batch |
| Questions withdrawn | Flight Plan | A question batch nobody can answer any more, and why |
| Delivery | Flight Plan | The agent has received the reviewer's messages and answers up to a sequence |
| Agent failure | Flight Plan | Why an agent could not start or stopped on its own |
| Model choice | The reviewer | The model the agent runs with from its next start, picked in Chat |

The reviewer's messages and the answers to the agent's questions are **inbound**. Those after the last delivery are **pending**, and Flight Plan hands them to the agent the next time it can.

## Questions

A question either offers **options**, each a label and a description, with one or several picks, or offers none and asks for **free text**. The reviewer can always write their own answer. Every question in a batch must be answered before the batch is accepted.

A **permission request** is a question batch Flight Plan asks for an agent it started: the agent wants to use a tool, and the reviewer allows or denies it. The answer goes straight back to the agent and is never delivered as inbound. If nobody answers within ten minutes, the call is refused and the batch is withdrawn.

## Agent sessions

### Spawned sessions

When something is pending and no agent can take it, Flight Plan starts the reviewer's default agent itself. Only Claude can be started this way.

- The agent runs as an ordinary interactive `claude` session, in a terminal Flight Plan owns, with the review target's repository folder as its working directory. It is never started with `-p`.
- Its first prompt is the pending inbound text. The session is told that nobody reads its terminal, and to reach the reviewer only through the MCP tools.
- The first session of a conversation gets a new id. Once Claude reports that it started, the id is saved with the conversation, and every later start resumes it, so the conversation continues where it stopped.
- The session runs with Flight Plan's own MCP tools allowed, so writing the review and reaching the reviewer never ask. Any other tool follows the reviewer's Claude settings, and one those settings do not allow becomes a permission request.
- The session loads the `flightplan-spawn` plugin for that run only. Its hooks call Flight Plan when a prompt is submitted, after each tool call, when it needs permission, and when its turn ends. The first of these calls is how Flight Plan knows the session started. Sessions the reviewer starts never load it.
- When a turn ends with something pending, the session continues with it. Otherwise Flight Plan closes it, and starts it again when the next reply arrives.
- A session that does not report its start within 90 seconds, or does nothing for ten minutes, is closed. One that stops on its own is recorded as an agent failure with the end of its terminal output.

### Sessions the reviewer starts

An agent session the reviewer started themselves can use the same MCP tools. Flight Plan cannot resume it, so it waits for replies by running a `curl` command against the review target's listening stream, which the tools give it. The command exits as soon as a reply arrives and prints the reply and the next command. While such a session listens, or within ten minutes of its last listen, Flight Plan leaves pending replies to it instead of starting an agent.

## Chat

The reviewer reads and answers the conversation in **Chat**, a panel on the review page. It shows the messages and question batches in journal order and follows each change as it is appended. A question batch that is open is answered in the panel: a pick per question, several where the question allows it, and the reviewer's own words; a permission request shows what the tool would run, with Allow and Deny. Messages are Markdown. A [CodeLink](review-artifact.md#codelink) in a message, `[label](code:path#target)`, opens the code as it does in the review artifact, when the review's sources hold that code. Selecting code and choosing "Ask the agent" attaches a code reference such as `storefront@9f2c1ab:src/x.ts#L3-9` to the next message.

The agent Flight Plan starts for a review target is the session that writes its review artifact, so it can answer about the review and, when the reviewer asks, change the artifact through the same MCP tools it writes with.

## Write-up on demand

The reviewer can ask the agent for the write-up of one part of the review from the page: one waypoint ("Let Claude explain", named after the agent), every waypoint of a root code block ("Explain the whole code block"), one card of a Trace Diagram, or one file of a Blast Diagram, from its side panel. `review.requestWriteUp` (`procedures/request-write-up/`) takes the review and a target:

| Target | Required, and asked of the agent |
|---|---|
| `{ kind: "waypoint", waypointId }` | The waypoint: its title and reading |
| `{ kind: "root-block", rootBlockId }` (the id the page gives the root code block, `src/price.ts#function:priceOf`) | Every unwritten waypoint in it, steps included |
| `{ kind: "trace-node", segmentId, nodeId }` | The card: its label and the labels of its trigger labels and listed blocks ("Explaining the card") |
| `{ kind: "blast-file", segmentId, path }` | The file's impact type and reason ("Assessing the file"). A file of the change has none and is refused. With segments off the page shows one Blast Diagram joined from every segment under the first segment's id, so when that segment has no such file the file is looked for in the segment that holds it. |

| What happens | When |
|---|---|
| The part is marked required, the review becomes drafting, the setup's default agent becomes its writer, and the agent is sent a message, as a chat message is: "The reviewer asks for the write-up of the waypoint `w2` alone: write its title and its reading, and nothing else." The answer is `started` with "Explaining 1 waypoint". | The target has something unwritten |
| The answer carries the line to run, to paste into that agent | The default agent is one Flight Plan cannot start |
| `started` with "The agent did not start: …" and the reason, the waypoints staying required for the next time the agent runs | The agent could not be started or reached |
| `written`, "This is already explained." | Everything of the target is written |
| `rejected` with `field: "target"` | The review has no such waypoint, card or file, the code block has no waypoint, or the file is part of the change |
| `rejected` with `field: "agent"` | No agent is set up |

While the review is drafting and its agent runs, or the reviewer's own agent writes it, a required part with something unwritten is drawn as being written: `isBeingWritten` on a waypoint with no reading, on a Trace Diagram card with a label to write, and on a Blast Diagram file with no impact.

## Agent states

The web app shows one state per conversation: **not running**, **starting**, **working**, **waiting for your answers**, **listening** (a session the reviewer started is waiting for a reply), or **could not start**, with the reason.

## Model

Each agent has a model and an effort chosen on the setup page, and the reviewer can switch the model in Chat. A write-up asks the setup's default agent with its saved model and effort. A start runs the last model picked in Chat for that agent, otherwise the one saved with the review's request, otherwise the setup's. A pick in Chat keeps the effort the agent runs at when the new model offers it, and falls back to the agent's default effort when it does not. The setup's effort is the one a write-up starts from, for every model that offers it, and the one a conversation runs at when its review has no request. The models on offer are the ones the agent itself lists, each with the efforts it supports: Flight Plan asks the agent's command line program once per run of the server and keeps no list of its own. Claude is asked through the `initialize` control request of `claude -p`, which sends no prompt. An agent that cannot be asked (Codex and Cursor today, or Claude when the request fails) offers only its default, named "Your Claude default", plus the model already saved for it. The value `default` leaves the choice to the agent; any other value is passed to the spawned session as its model.
