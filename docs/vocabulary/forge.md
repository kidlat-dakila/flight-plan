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
| `glab` | GitLab, cloud or self-managed, through the GitLab CLI | The CLI's own sign-in |
| `bitbucket` | Bitbucket Cloud, or a Bitbucket Data Center instance named by its base URL | A username and a token |

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
| `baseSha` | The commit a pull request or branch is compared against: where it left its target branch, or the tip of that branch when the checkout does not hold both commits | Yes |
| `branches` | List the branches that the main branch does not contain, with their last author and where each began: those of the checkout and its remotes, or those of the checkout alone | Yes |
| `history` | Name the signed-in user, and list pull requests in every state with their reviews, comments and commits | No |
| `people` | Search the people tied to the repository, for the tracked authors | No |
| `files` | List the paths of every file at a commit | Yes |
| `search` | Find the files at a commit whose text matches a pattern, among the files with given extensions | Yes |
| `discussion` | Read a pull request's comments, its comment threads on lines of the diff, and its submitted reviews | No |
| `review` | Submit a review with a verdict, a summary and comments on lines, and comment on the pull request as a whole | No |
| `replies` | Reply to a comment thread | No |
| `resolution` | Resolve a comment thread and reopen it | No |
| `reviewRequests` | Search the people who can review, request a review from one, and remove a request | No |
| `repeatedReviewRequests` | Ask a reviewer who already answered for another review | No |

`gh`, `github`, `gitlab` and `glab` offer every capability. `bitbucket` offers every capability except `labels`, `filters` and `repeatedReviewRequests`, on Cloud and on Data Center. On Data Center, `diff` of a pull request, `compare` and `blob` read the local checkout, so they work once its commits are fetched. Data Center names the signed-in user in the `X-AUSERNAME` header of every REST answer, and the adapter reads it from `/rest/api/1.0/application-properties`. Every request it makes is under `/rest`, because Data Center refuses an HTTP access token on other paths. On every adapter, `files` and `search` read the local checkout too, and so does reading many files at once.

## Review targets

What a reviewer can review is a **review target**: either a pull request, identified by its number, or a branch, identified by its name. A branch is never given a made-up pull request number, because that number would appear in storage paths and links and could collide with a real one.

Where a review target stands in its review is its [branch status](branch-status.md).

### Which review targets the index lists

A review target is listed when it belongs to a person Flight Plan follows in that repository:

- On a forge, a pull request is listed when its author is one of the repository's tracked authors or is the signed-in user. Every state is read, up to 15 pull requests per author, newest update first. With no tracked author, every pull request is listed: the forge reads the repository's 50 most recently updated pull requests of any author, in every state, besides those of the signed-in user.
- On local git, a branch is listed when the main branch does not contain it and the author of its last commit is one of the repository's tracked authors or the author the user chose as themselves. With no tracked author, Flight Plan lists no branch on its own, not even the user's, and the line shows only the branches added by hand. When it lists none, the line says so and offers to add a branch. The main branch is read from `origin/HEAD`, or is the first of `origin/main`, `origin/master`, `main` and `master` that exists.

- On either, a branch that has a review artifact and is still in the checkout is listed too, whoever wrote its last commit. It is dated by when its review artifact was requested.
- On either, a review target the user added by hand is listed too, whoever wrote it. An added pull request is read with the pull requests of its author, so its branch status is derived as for any other, and an added branch is listed while it is a local or a remote branch that the main branch does not contain. On a forge, an added branch is left out once a listed pull request comes from it.

### Adding a review target by hand

The plus button on a repository's line searches that repository's branches, local and remote, for a review target to add. The main branch and the branches it contains are left out, and a remote branch with the same name as a local one is one branch. Each branch that an open pull request comes from is offered as that pull request in its place: the forge lists up to 100 open pull requests, newest update first, and each says the branch it comes from (`headBranch`). On local git, or when the forge cannot list them, every branch is offered as a branch. An empty search offers the five most recently updated, and a typed search ranks every branch and pull request by a fuzzy match of the branch name, the title and `#<number>`, and offers the ten best. A review target the line already lists is offered but cannot be chosen.

Adding reads the branches and pull requests again and adds the one asked for, or the open pull request that now comes from the branch asked for. It is stored in `<repository>/targets.json`, and an added review target is never new.

Local git fetches in the background at most every five minutes, so new branches show up without the user running git. A fetch that fails leaves the local branches as they are.

### Who can be tracked

The people offered as tracked authors on a forge are the repository's members and the authors of its latest pull requests, matched by login or name:

| Forge | Members | Latest pull requests |
|---|---|---|
| GitHub | The users the repository can assign (`assignableUsers`, which is empty for someone who is not a member of a public repository) | The authors of the 100 latest updated |
| GitLab | The project's members, including inherited ones | The authors of the 100 latest updated |
| Bitbucket Cloud | The workspace's members | The authors of the 50 latest updated |
| Bitbucket Data Center | The users matching the typed text | The authors of the 50 latest updated |

A person is identified by their login, written with a leading `@`, and a tracked author is matched to a pull request by that login with case and the leading `@` ignored. On Bitbucket Cloud the login is the nickname, and a pull request is found by `author.nickname` in Bitbucket's query language. A person whose account has no nickname cannot be tracked there.

### New review targets

A review target is **new** when it began after Flight Plan first listed its repository, has the branch status `no-review`, and the user has not dismissed it. A pull request began when it was opened. A branch began at its oldest commit that the main branch lacks. The index prompts for a review of each new review target until the user dismisses it, or until its Flight Plan is complete and uploaded. Apart from that and from listing the branches that have one, the index does not look at review artifacts: its links point at the review page, `/pr-reviews/<repository>/pr-<number>` for a pull request and `/pr-reviews/<repository>/branch-<name>` for a branch. The moment Flight Plan first listed the repository and the dismissed review targets are stored in `<repository>/targets.json` (see [data storage](data-storage.md)).

### Which forge serves a repository

The forge is chosen per repository from the repository's remote. When a connection set up on the setup page serves the remote's host (`github.com` for `gh` and `github`, `gitlab.com` for `gitlab`, `bitbucket.org` for `bitbucket`, or the base URL's host for a self-hosted instance), that connection serves the repository, and the default forge wins when several do. Otherwise the default forge serves it, and a repository on another host reports `host-mismatch`. The GitLab CLI choice is served by the `glab` adapter, which needs no token and serves any host that is not `github.com` or `bitbucket.org`, because the CLI knows its own hosts.

Flight Plan knows the user in a repository by `git config user.email`, read in the repository's folder, so local settings win over global ones. Commits and branches are the user's when their author email is that email; `user.name` is only shown. A pull request is the user's when its author is the account signed in to the forge.

The user's recent repositories are the ten repositories in the home folder with the user's latest commits on their main branch, newest first. The main branch is `main`, or `master` when there is no `main`. A repository with neither, with no `user.email` in git config, or with no commit by the user on its main branch is left out. Worktrees of one repository count once, under the main worktree's folder.

The forge that serves a repository also decides which users the repository needs. A repository that local git serves, and whose git config has no email, needs the author the user chose as themselves, and may have tracked authors besides. When git config has an email, that email is the user and no author is chosen. A repository that any other forge serves has no author chosen as the user, because the forge knows who is signed in. Neither needs a tracked author. This holds for the setup page, the Add repository dialog and the Configure repository dialog alike, whatever the default forge is.

A pull request records the branch it is opened against when the forge says so. That matters for stacked pull requests: the diff must be taken against the branch below, not against the main branch.

## Discussion and reviews

A pull request's **discussion** is what its people wrote on it: comments on the pull request as a whole, **comment threads** on lines of the diff, and **submitted reviews**.

A comment thread sits at a **diff position**: a file, a side, a first line and a last line. The side is `new` for a line the change adds or keeps, numbered as in the file after the change, and `old` for a line the change removes, numbered as in the file before it. A thread on one line has the same first and last line. A thread whose line a later commit took away has no position, and is marked as outdated.

A review carries one **verdict**:

| Verdict | Meaning |
|---|---|
| `comment` | Comments without a verdict |
| `approve` | Approves the change |
| `request-changes` | Asks for changes before merging |

An adapter names the verdicts it takes, so the web app offers only those. Every forge adapter takes all three. GitHub takes a review in one call: the verdict, the summary and every comment with its position, against the commit the comments were written on. GitLab and Bitbucket have no such call, so their adapters post each comment, then the summary, then the verdict. GitLab's request for changes is a GraphQL mutation, the one call of that adapter outside its REST API. GitLab and Bitbucket Data Center need to know whether a line is added, removed or unchanged, so those adapters read the diff first and refuse the whole review when a comment is on a line the diff does not hold.

A forge decides who may do what: approve, resolve a thread, request a reviewer. An adapter never checks this itself. It passes the forge's own reason on when the forge refuses.

Asking a reviewer who already answered for another review is its own capability, because not every forge has it. GitHub takes it as one more request. GitLab takes it as the `/request_review` quick action in a note, which leaves no comment behind. Bitbucket has no such action, so the web app does not offer it there.

## Reviewer states

A reviewer state is the forge's own record of what one reviewer did. The [branch status](branch-status.md) is Flight Plan's reading of the whole pull request, and it defines who counts as a reviewer.

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
| `unknown` | The forge failed in a way no other problem names |

## Credentials

A forge credential is stored in the operating system's keychain (the macOS Keychain, the Windows Credential Manager, or the Linux Secret Service), under the service `flightplan` with the forge's name as the account, and never in plain text. It is never logged, never returned by any API, and never shown in an error message.
