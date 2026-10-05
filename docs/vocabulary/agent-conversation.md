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
- The session loads the `flightplan-spawn` plugin for that run only. Its hooks call Flight Plan when a prompt is submitted, after each tool call, when it needs permission, and when its turn ends. The first of these calls is how Flight Plan knows the session started. Sessions the reviewer starts never load it.
- When a turn ends with something pending, the session continues with it. Otherwise Flight Plan closes it, and starts it again when the next reply arrives.
- A session that does not report its start within 90 seconds, or does nothing for ten minutes, is closed. One that stops on its own is recorded as an agent failure with the end of its terminal output.

### Sessions the reviewer starts

An agent session the reviewer started themselves can use the same MCP tools. Flight Plan cannot resume it, so it waits for replies by running a `curl` command against the review target's listening stream, which the tools give it. The command exits as soon as a reply arrives and prints the reply and the next command. While such a session listens, or within ten minutes of its last listen, Flight Plan leaves pending replies to it instead of starting an agent.

## Agent states

The web app shows one state per conversation: **not running**, **starting**, **working**, **waiting for your answers**, **listening** (a session the reviewer started is waiting for a reply), or **could not start**, with the reason.

## Model

Each agent has a model chosen on the setup page. "Your Claude default" leaves the choice to Claude. Opus, Sonnet and Haiku are passed to the spawned session as model aliases.
