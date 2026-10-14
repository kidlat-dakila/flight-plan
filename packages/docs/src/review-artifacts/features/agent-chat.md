---
title: Agent chat
description: Talk to the agent that wrote the review, answer its questions and approve its tools.
---

**Chat** opens a panel beside the review where you talk to the agent that wrote it. Ask why it flagged something, or what a piece of code you selected does.

![Asking the agent about selected code](../../../media/agent-chat-light.webm)

## Talking to the agent

Type in **Ask about this review** and press Enter. Shift+Enter starts a new line. The agent starts with your first message if it isn't running.

To ask about specific code, select it and choose **Ask the agent**. The reference to those lines is attached above the message box. Code links in the agent's answers open the code they point at.

The panel's header shows what the agent is doing, such as **Agent working** or **Agent listening**. When the agent offers more than one model, you can switch from the panel. The new model takes over from the agent's next turn.

Chat needs Flight Plan to start the agent. In **Manual** mode, chosen under [Agent integration](/docs/setup/agent-integration/), there is no chat.

## Questions from the agent

The agent can ask you one question or several at once. They appear in the chat with options to pick from, and you can always write your own answer.

## Permissions

When Flight Plan started the agent and it wants a tool your Claude settings don't allow, Flight Plan asks you: **Allow the agent to use** the tool, with the command, path or address it wants. Choose **Allow** or **Deny**, and tell the agent why if you deny it. The agent waits for your answer before it goes on. A request nobody answers is withdrawn after ten minutes.
