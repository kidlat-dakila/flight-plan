# Troubleshooting

## Error log

Flight Plan logs anything that goes wrong, handled or not, in the **error log**: one JSON file per error in `logs/` of the data directory (see [data storage](data-storage.md)). An **error log entry** holds where the error happened (its source), its message, its stack, the Flight Plan version (`null` for a development build) and the operating system. Each entry is named by its **log id**, `<UTC date>-<UTC time>-<6 hex characters>`, such as `20261023-142530-a1b2c3`.

| Source | What failed |
|---|---|
| `tRPC <route>` | A call from the web app. The error the web app receives carries the entry's log id in `data.logId` |
| `MCP tool <tool>` | An agent's call to an MCP tool, thrown or answered as an error result |
| `Request <method> <route>` | Any other request to the server |
| `Forge <adapter> <operation>` | A call to git or a forge through a `GitAdapter`, also one Flight Plan recovers from. `open` is an adapter that could not be opened |
| `Page <path>` | An error the web app threw on that page, reported through `troubleshooting.recordError` |
| `Agent install`, `Agent terminal`, `Troubleshoot terminal` | Bringing an agent up to date, or opening a terminal for it |
| `Flight Plan start`, `Flight Plan process`, `Log cleanup`, `Data migration` | Starting the server, a crash, pruning the log, and a [migration](migrations.md) |

**Redaction.** Before an entry is written, `redactText` takes out private keys, `Authorization` values, bearer and basic credentials, forge tokens (`ghp_`, `github_pat_`, `glpat-`, `ATBB`, `ATATT`), JSON web tokens, values of fields named like a token, secret, password, key or credential, credentials in an address, emails, the user name, and the home folder, which it writes as `~`. A troubleshoot request is redacted the same way.

**Folding.** The same message from the same source within 10 minutes is one entry, so a forge that keeps refusing a poll does not fill the log. A failure that was already logged, such as a forge error that a tRPC route then throws, keeps its first log id.

**Pruning.** When the server starts, it removes the entries older than 30 days and all but the newest 500.

## Troubleshoot request

A **troubleshoot request** is what the user asks Flight Plan to troubleshoot, saved in the error log under its own log id: what the user wrote, the page they asked from, the error that page showed (`shownError`), the log id of that error when it has one (`errorLogId`), the log ids of the latest errors before it, and the agent that troubleshoots.

The user makes one in the **Troubleshoot Dialog**. It opens from the Troubleshoot button in the top bar with no error, and from the Troubleshoot link of any error the web app shows from a failed call, with that error. A field message that only says what to fix has no link.

Flight Plan then opens a terminal in the logs folder and starts Claude, the only agent that troubleshoots, with `/flightplan:troubleshoot <log id>` (`troubleshooting.request`, `procedures/request-troubleshooting/`). The terminal is a new tab in the setup's **terminal app** (`terminalApp` of the agents choice, Terminal by default), opened the same way as a live agent's (see [agent conversation](agent-conversation.md)), and the dialog's message names that app. What the user wrote never goes on the command line. Where Flight Plan cannot open a terminal, the dialog gives the command to copy.

## The troubleshoot skill

The plugin's `troubleshoot` skill reads the request through the MCP tool `troubleshoot`, which takes a log id and returns the request, its error, the recent errors, the logs folder, where Flight Plan's source and docs are on GitHub at the running version, and where issues are reported. When the server cannot be reached, the skill reads the files in the logs folder. It suggests a fix the user can make. When the cause is a bug in Flight Plan, it searches the open issues, passes on the author's message word for word when none matches, asks the user, and drafts an **issue** in a set shape: summary, environment, what happened, root cause, proposed fix and the error. An issue never holds the user's data: no personal data, no code or paths from their repositories, no repository, branch or pull request names, no review text. The user approves the text, and the agent opens GitHub's new issue page with the title and body in the address, under 6500 characters, for the user to post from their own account. Flight Plan holds no token and posts nothing.
