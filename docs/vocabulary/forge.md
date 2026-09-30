# Forge

## Definition

A forge is the service that hosts a repository and its review apparatus: pull requests, reviewers, diffs, comments. GitHub, GitLab and Bitbucket are forges. Flight Plan reaches every forge through one interface, the **forge adapter**, so the rest of the code never knows which forge it is talking to.

Plain git also has an adapter. It has no forge behind it, and it still lets a reviewer review a local branch.

## Forge adapters

| Adapter | Reaches | Credential |
|---|---|---|
| `git` | The local repository only | None |
| `gh` | GitHub, through the GitHub CLI | The CLI's own sign-in |
| `github` | GitHub, cloud or Enterprise | A token |
| `gitlab` | GitLab, cloud or self-managed | A token |
| `bitbucket` | Bitbucket Cloud | A username and a token |

An adapter is bound to one repository when it is created. For a self-hosted forge, it also takes the forge's base URL.

## Capabilities

Each adapter declares what it can do, instead of failing when asked. The web app reads these declarations to decide which controls to show, so a control that cannot work is shown as unavailable rather than failing on click.

| Capability | Meaning | `git` |
|---|---|---|
| `list` | List pull requests to review | No |
| `labels` | List the repository's labels, for filtering | No |
| `filters` | Filter the list by review state on the forge | No |
| `reviewers` | Name the author and each reviewer's state | No |
| `permalink` | Link into the forge's own diff view | No |
| `diff` | The whole diff of a pull request or branch | Yes |
| `compare` | The diff between two commits, used for staleness | Yes |
| `blob` | A file's content at a commit | Yes |
| `headSha` | The commit at the head of a pull request or branch | Yes |

`gh`, `github` and `gitlab` offer every capability. `bitbucket` offers every capability except `labels` and `filters`.

## Review targets

What a reviewer can review is a **review target**: either a pull request, identified by its number, or a branch, identified by its name. A branch is never given a made-up pull request number, because that number would appear in storage paths and links and could collide with a real one.

A pull request records the branch it is opened against when the forge says so. That matters for stacked pull requests: the diff must be taken against the branch below, not against the main branch.

## Reviewer states

| State | Meaning |
|---|---|
| `pending` | Asked to review, has not responded |
| `commented` | Left comments without approving or objecting |
| `approved` | Approved the change |
| `changes-requested` | Objected to the change |

## Problems

When a forge call fails, the adapter reports what kind of problem it was, so the web app can say something specific:

| Problem | Meaning |
|---|---|
| `no-cli` | A required command line tool is not installed |
| `auth` | Not signed in, no token, or the token cannot see the repository |
| `no-repo` | Not a repository, or no remote the adapter recognises |
| `host-mismatch` | The repository's remote is on a different host than the chosen forge |
| `unsupported` | The adapter does not offer this capability |
| `network` | The forge could not be reached |

## Credentials

A forge credential is stored securely and never in plain text. It is never logged, never returned by any API, and never shown in an error message.
