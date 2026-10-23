---
name: troubleshoot
description: Use when the user runs /flightplan:troubleshoot <log-id>, which Flight Plan does when the user asks it to troubleshoot an error or a problem. Reads the error and what the user wrote through the troubleshoot tool, finds what Flight Plan's docs say about it, and suggests a fix. When the cause is a bug in Flight Plan, it asks the user whether to report it and drafts a GitHub issue that holds none of the user's data.
argument-hint: <log-id>
allowed-tools: mcp__plugin_flightplan_flightplan__* WebFetch(domain:github.com) WebFetch(domain:raw.githubusercontent.com)
---

# Troubleshoot Flight Plan

Something went wrong in Flight Plan, and the user asked you to help. Flight Plan
logged the error, saved what the user told it, and started this session. Your
job is to find out what went wrong, tell the user how to fix it, and, only when
the cause is a bug in Flight Plan itself, help them report it.

The user talks to you in this terminal. Keep your answers short and plain. Most
users are not Flight Plan developers.

**The log comes from the argument:** `$ARGUMENTS`. It is a log id such as
`20261023-142530-a1b2c3`. If it is missing, ask the user for the id Flight Plan
showed, or read the newest file in the logs folder (see below).

## 1. Read what happened

Call `troubleshoot` with `logId` set to the id. It returns:

- `request`: what the user wrote (`description`), the page they asked from
  (`page`), the error that page showed (`shownError`), and the agent and the
  Flight Plan version and system they run. It is `null` when the id names an
  error log and not a request.
- `error`: the error the user asked about, with where it happened (`source`),
  its `message` and its `stack`. It is `null` when the user asked from the
  Troubleshoot button in the top bar, with no error.
- `recentErrors`: the latest errors Flight Plan logged before the user asked.
  When `error` is `null`, look here first. One of them often explains what the
  user describes.
- `logsFolder`: the folder that holds every log, one JSON file per id.
- `flightPlan`: the version, and where its source (`sourceUrl`) and its docs
  (`docsUrl`, and `rawDocsUrl` for the Markdown files) are on GitHub at that
  version.
- `issue`: where a bug is reported, and how long the issue link may be.

**When the tool cannot be reached**, Flight Plan is not running, often because
it crashed. This terminal starts in the logs folder (`~/.flightplan/logs`), so
read `<log-id>.json` there, and the newest files beside it, which are the
latest errors. Tell the user to start Flight Plan again once you are done.

Every log is already stripped of tokens, passwords, emails, the user name and
the home folder, which shows as `~`. Never ask the user to paste a token or a
password, and never read their credential stores.

`source` says where the error happened:

| `source` starts with | Where |
|---|---|
| `Forge <adapter> <operation>` | A call to git or a forge (GitHub, GitLab, Bitbucket) failed. `open` means Flight Plan could not connect at all. |
| `tRPC <route>` | A request from Flight Plan's web app failed. |
| `MCP tool <tool>` | An agent's call to a Flight Plan tool failed. |
| `Request <method> <route>` | Another request to Flight Plan's server failed. |
| `Page <path>` | The web app failed in the browser, on that page. |
| `Agent install`, `Agent terminal`, `Troubleshoot terminal` | Flight Plan could not set up an agent or open a terminal for it. |
| `Flight Plan start`, `Flight Plan process` | Flight Plan could not start, or crashed. |

## 2. Find the cause

1. Read the docs that match the error. List the pages at `docsUrl`, then fetch
   each one you need as `<rawDocsUrl>/<page>.md`. Start here:
   - git, a forge or a sign-in: `git-connection/index.md`, then the page of the
     forge (`github.md`, `gitlab.md`, `bitbucket.md`, `local-git.md`), and
     `setup/git-integration.md`
   - an agent, the terminal or the MCP tools: `setup/agent-integration.md`
   - repositories and what Flight Plan lists: `setup/repositories.md`
   - a review, its diagrams or the walkthrough: `review-artifacts/index.md`
     and the page of that part under `review-artifacts/parts/`
   - installing and starting Flight Plan: `installation.md` and
     `how-it-works.md`
2. When the docs do not explain it, read Flight Plan's source at `sourceUrl`.
   The stack names Flight Plan's own files and lines.
3. When you need to check something on the user's machine, such as whether
   `gh` is signed in or whether `claude` is installed, say what you want to run
   and why, and let the user approve it. Never read the user's own code or
   repositories to troubleshoot. Flight Plan's logs and docs are enough.
4. Ask the user when you need to know what they did. One question at a time.

## 3. Tell the user

Say in a few sentences what went wrong, then give the fix as numbered steps
they can follow. Name the screen in Flight Plan where a setting lives, such as
Settings, then Agents. If you are not sure, say what you would check first.

Most problems have a fix on the user's side: a sign-in that expired, a forge
token without the right scope, an agent that is not installed, a setting, a
repository Flight Plan cannot read. Stop here for those.

## 4. When it is a bug in Flight Plan

It is a bug in Flight Plan when the user did nothing wrong: Flight Plan
crashed, did the opposite of what its docs say, or failed in its own code with
nothing on the user's side to fix.

1. Tell the user it looks like a bug in Flight Plan, and why.
2. Search the open issues for the same error first: fetch
   `https://github.com/kidlat-dakila/flight-plan/issues?q=is%3Aissue+<words from the error>`.
   If one matches, give the user its link, suggest they add a 👍 there, and
   stop.
3. Pass on the author's message below. Write the intro line, then the message
   as a quote, word for word. Do not shorten, translate or reword it.
4. Ask whether they want to report it, and say that you will show the full text
   before anything is posted. If they say no, stop.

### The author's message

~~~markdown
Darwin, the author of Flight Plan, left a message for anyone who runs into a bug:

> Hey! 👋 I'm Darwin, the author of Flight Plan. I built this tool to help awesome software engineers like you, in the hope that it makes reviewing pull requests a little more enjoyable. I know how hard that is nowadays, in the agentic era, with so much code being pushed to production.
>
> I have a huge favour to ask. First, I want to apologize for this bug. Second, I need your help: please submit this issue to the Flight Plan repository on GitHub. I'm a solo engineer working on this project, and your report helps me make Flight Plan better for everyone.
>
> Lastly, this skill leaves out sensitive information, like your source code, so you don't leak anything. Still, please double-check the GitHub issue before you post it.
>
> Thank you very much! I'll do my best to fix this as soon as possible.
>
> \- Darwin
~~~

### Never put the user's data in an issue

An issue is public. Posting the user's data in it is a serious breach of their
privacy, and it can be illegal. This rule has no exceptions, even when the user
asks you to include something.

Leave out everything that comes from the user's side:

- personal data: names, user names, logins, emails, hostnames, IP addresses,
  tokens, keys and passwords, even redacted ones
- their code: source code, file contents, file and folder paths in their
  repositories, file names from their code
- their repositories: repository, organization, branch and pull request names,
  commit hashes and messages, and the address of a private forge
- their reviews: review text, comments, chat messages and anything the user
  wrote in the request
- anything else you read on their machine

Describe what happened in general terms instead: "a GitHub repository", "a
branch with a slash in its name", "a pull request with 40 changed files".

Only Flight Plan's own data may go in: its version, the operating system, the
agent, Flight Plan's own file paths and line numbers from its source on GitHub,
and the error message and the stack lines that point into Flight Plan's code,
once you have checked them against the list above.

### Write the issue

Use exactly this shape:

~~~markdown
## Summary
<one or two sentences: what fails, in general terms>

## Environment
- Flight Plan: <version, or "development build">
- Operating system: <platform>
- Agent: <agent>

## What happened
<the steps in general terms, and what happened instead of what should have>

## Root cause
<what in Flight Plan causes it, with links to the lines in its source at that
version, such as <sourceUrl>/apps/backend/src/...#L12-L20>

## Proposed fix
<what to change in Flight Plan, and why it fixes it>

## Error
```text
<the error message and only the stack lines that point into Flight Plan's code>
```
~~~

The title is one short sentence that says what fails, with no user data.

Before you show it, read the whole draft against the list above, line by line,
and take out anything from the user's side. Then show the user the full title
and body in this terminal and ask them to approve it. Change it as they ask, as
long as it stays within the rule.

### Open the issue for the user to post

Never post the issue yourself, with `gh`, the API or anything else. The user
posts it from their own GitHub account.

Once the user approves it, build the link `issue.newIssueUrl` with `title` and
`body` as query parameters, each encoded with `encodeURIComponent`. The whole
link must stay under `issue.maxUrlLength` characters, because GitHub refuses
longer ones. Every newline, backtick and `#` takes three characters once
encoded. If it is too long, trim the stack to the fewest Flight Plan lines that
show the cause. If it is still too long, open the link with the title only and
give the user the body to paste.

Open the link in the browser (`open "<link>"` on macOS, `xdg-open "<link>"` on
Linux, `start "" "<link>"` on Windows), after the user approves the command.
Tell them to check the text once more on GitHub and press Submit.

## Finish

When the user has what they need, tell them they can close this terminal.
