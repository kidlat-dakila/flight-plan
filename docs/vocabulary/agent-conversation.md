# Agent conversation

## Definition

An agent conversation is the exchange between a coding agent and the reviewer about one review target, a pull request or a branch. The agent reaches the reviewer through Flight Plan's MCP tools, the reviewer answers in the web app, and Flight Plan carries each side's words to the other.

Each review target has one conversation. The agent that serves it is a **live agent**: a session the reviewer runs in a terminal they can see, with `/flightplan:live <repository>/<target>`. Flight Plan never starts an agent where the reviewer cannot see it. Several review targets can each have live agents at the same time.

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
| Agent failure | Flight Plan | Why an agent could not start or stopped on its own. Only conversations from before live agents hold one. |
| Model choice | The reviewer | The model the terminal Flight Plan opens starts Claude with, picked in Chat |

The reviewer's messages and the answers to the agent's questions are **inbound**. Those after the last delivery are **pending**, and Flight Plan hands them to the next live agent that listens. Requests Flight Plan makes for the reviewer, a write-up, a Flight Plan to publish or one to fetch, are reviewer messages too, so they wait in the same place.

## Questions

A question either offers **options**, each a label and a description, with one or several picks, or offers none and asks for **free text**. The reviewer can always write their own answer. Every question in a batch must be answered before the batch is accepted.

A **permission request** is a question batch from a conversation of the time Flight Plan started agents itself. Chat still shows one, but nothing asks one now: a live agent asks for permission in its own terminal.

## Live agents

A live agent is a session the reviewer runs with the `live` skill of the Flight Plan plugin, `/flightplan:live <repository>/<target>` (for example `/flightplan:live storefront/pr-412`), in the repository's folder. It serves that one review until the reviewer closes its terminal.

- **It listens.** The review's listening stream is `GET /api/<repository>/<target>/live/agent`, run as `curl -sN "<server>/api/<repository>/<target>/live/agent"` in the foreground. The stream waits until something is pending, sends it as one `work` event with the command to listen again, records the delivery and closes. After 9 minutes with nothing pending it sends an `idle` event that says to listen again, and closes without a delivery.
- **It does the work and listens again.** A write-up request is written with the review skill, a chat message is answered with `send-message`, a question goes out with `ask-questions` and its answers come back on the stream.
- **Each request goes to one agent.** Two live agents can listen on one review. A request is claimed by the first stream that reads it, so the other keeps waiting.
- **It is online** while its stream is open, or for 15 seconds after any call it makes to Flight Plan's MCP tools, the `ping` tool included. The skill calls `ping` at least every 5 seconds while it works without calling Flight Plan. Every tool that names a review target counts. Coming back online wakes the review's watchers.
- **Flight Plan opens its terminal on macOS** when the reviewer asks it to, from the Launch Agent dialog (`review.openAgentTerminal`, `procedures/open-agent-terminal/`). Terminal runs `cd <repository folder> && claude '/flightplan:live <repository>/<target>'` with the model and effort of the review (the last pick in Chat, then the review's request, then the setup's), and allows Flight Plan's MCP tools and the listen command, so neither asks for permission. On other systems, and for an agent other than Claude, the reviewer copies the command and runs it themselves.

Codex and Cursor have no live skill. The Launch Agent dialog gives them a one-line prompt to use the review skill and the listen command the tools give them.

`review.liveAgent` (`procedures/get-live-agent/`) says whether an agent is online for a review and gives the Launch Agent dialog its words: `{ kind: "live", isOnline, statusLabel, dialog }`, or `{ kind: "unavailable" }` with no agent set up or for a repository Flight Plan does not follow.

## Chat

The reviewer reads and answers the conversation in **Chat**, a panel on the review page. It shows the messages and question batches in journal order and follows each change as it is appended. A question batch that is open is answered in the panel: a pick per question, several where the question allows it, and the reviewer's own words; a permission request shows what the tool would run, with Allow and Deny. Messages are Markdown. A [CodeLink](review-artifact.md#codelink) in a message, `[label](code:path#target)`, opens the code as it does in the review artifact, when the review's sources hold that code. Selecting code and choosing "Ask the agent" attaches a code reference such as `storefront@9f2c1ab:src/x.ts#L3-9` to the next message.

The live agent of a review target is the session that writes its review artifact, so it can answer about the review and, when the reviewer asks, change the artifact through the same MCP tools it writes with.

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
| The part is marked required, the review becomes drafting, the setup's default agent becomes its writer, and the request waits for the live agent as a chat message does: "The reviewer asks for the write-up of the waypoint `w2` alone: write its title and its reading, and nothing else." The answer is `started` with "Explaining 1 waypoint". | The target has something unwritten |
| The answer carries the line to run, to paste into that agent | The default agent has no live skill (Codex, Cursor) |
| `written`, "This is already explained." | Everything of the target is written |
| `rejected` with `field: "target"` | The review has no such waypoint, card or file, the code block has no waypoint, or the file is part of the change |
| `rejected` with `field: "agent"` | No agent is set up |

While the review is drafting and its live agent is online, or the reviewer's own agent writes it, a required part with something unwritten is drawn as being written: `isBeingWritten` on a waypoint with no reading, on a Trace Diagram card with a label to write, and on a Blast Diagram file with no impact.

## Agent states

The web app shows one state per review target: **online** or **offline**. Chat shows it as "Agent online" or "Agent offline", and the review page's top bar as the agent's name and its state, "Claude offline", which opens the Launch Agent dialog while the agent is offline.

## Model

Each agent has a model and an effort chosen on the setup page, and the reviewer can switch the model in Chat. A write-up asks the setup's default agent with its saved model and effort. The terminal Flight Plan opens starts Claude with the last model picked in Chat for that agent, otherwise the one saved with the review's request, otherwise the setup's. A pick in Chat keeps the effort the agent runs at when the new model offers it, and falls back to the agent's default effort when it does not. The setup's effort is the one a write-up starts from, for every model that offers it, and the one a conversation runs at when its review has no request. The models on offer are the ones the agent itself lists, each with the efforts it supports: Flight Plan asks the agent's command line program once per run of the server and keeps no list of its own. Claude is asked through the `initialize` control request of `claude -p`, which sends no prompt. An agent that cannot be asked (Codex and Cursor today, or Claude when the request fails) offers only its default, named "Your Claude default", plus the model already saved for it. The value `default` leaves the choice to the agent; any other value is passed to `claude` as `--model`, and an effort other than `default` as `--effort`.
