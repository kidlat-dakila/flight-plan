# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Software engineers who have become the bottleneck of their team. Coding agents make code cheap to write, so more pull requests arrive than anyone can read line by line, and the reviewer still holds them to the highest standard of code quality. They are tired of the queue, not of reviewing; they want each review to be easier without lowering the bar.

They review code in three situations that carry equal weight:

- **Reviewing a teammate's pull request.** They were asked to review a change on a team repository and need to understand it before approving or objecting.
- **Checking their own work.** They review their own branch, often code a coding agent wrote, before opening or merging a pull request.
- **Triaging many pull requests.** A lead or maintainer scans pull requests across several repositories and decides where attention goes.

The same person moves between these situations in one day. They run Flight Plan on their own machine, next to their editor, terminal and coding agent.

## Product Purpose

Flight Plan is an offline-first code review tool that helps reviewers understand and navigate the changes in a pull request, or in a branch with no pull request. It builds a review from the code itself and renders it in a local web app next to the code it describes. A review answers four questions a diff does not: why the change exists, how it runs, what it can affect, and where to look. The code answers the last three. A coding agent connects through Flight Plan's MCP tools and writes the prose: why the change exists, the labels and explanations, and the findings.

Success is a reviewer who reads a large change in the order it makes sense, spends attention on the lines that deserve it, and can see what the review did not cover.

## Positioning

Flight Plan is a code review tool with agent integration, not a tool for agents. The codegraph derives the structure of a review from the syntax trees: the segments, both diagrams, and the files and lines of the Code Walkthrough. A review is readable before any prose is written. The agent, or the author on their own pull request, writes the prose into that structure and cannot change it, so no writer can leave a caller out or invent one. The Code Walkthrough states how many of the change's files it covers, so a gap is visible instead of silent.

## Operating Context

- Started with `npx` or `pnpm dlx`. A local Fastify backend serves the web app, a tRPC API and an MCP endpoint.
- The reviewer picks a review target in the web app and reads the artifact Flight Plan builds for it. The reviewer runs their coding agent in a terminal they can see, with `/flightplan:live <repository>/<target>` or a terminal Flight Plan opens for them, and the agent writes the prose with the Flight Plan review skill while the reviewer reads.
- A review target is a pull request on a forge (GitHub, GitLab, Bitbucket) or a branch of a local repository.
- All data stays on the user's machine in `~/.flightplan/`. Nothing is stored in the reviewed repository and nothing is sent elsewhere.
- One data directory serves every repository the user reviews.

## Capabilities and Constraints

- The terms in [vocabulary](vocabulary/README.md) are binding in code, names and prose.
- The frontend renders only. Every filter, sort, grouping, count, label and format comes from the backend.
- The homepage (`/`) shows the repositories Flight Plan knows and their reviews. It is the way into each repository's reviews.
- A review artifact is `drafting` or `complete`, and becomes stale when the pull request moves past the commit it describes.
- Forge adapters declare their capabilities. A control that cannot work is shown as unavailable instead of failing when used.
- The component foundation is the shadcn primitives in `packages/ui/src/components/blocks` with Tailwind. Flight Plan has its own theme, in light and dark, including its own syntax colours. It does not follow the VS Code theme the extension used. The primitives may be modified to fit the theme.
- Flight Plan is a desktop tool. The review page does not support phone widths; reading a review on a phone would need a different view.
- The review page keeps the layout of the extension's review panel: one scrolling page with a sticky review header, full-width bands for the Context Section and the diagrams, and a Code Walkthrough where each file is drawn once with its waypoints as marks in the gutter of the code, each opening into a box inside the code.

## Brand Commitments

- The name is **Flight Plan**.
- The logo is an outlined aircraft taking off above a horizon line, drawn in amber. The source is `resources/icon.png` of the `vscode-flight-plan` repository. The web app uses it on a transparent background so that it works in light and dark mode.

## Evidence on Hand

- The vocabulary in `docs/vocabulary/` describes every part of the product.
- The logo file named above.
- There are no customers, testimonials, benchmarks or pricing. Future work must not invent them.

## Product Principles

1. **The code decides the structure.** Flight Plan states what the code proves, and a review stands on that alone. The agent, or the author, explains it.
2. **A gap is visible.** Coverage, drafts, staleness and unavailable capabilities are stated, never hidden.
3. **The backend decides.** The interface shows what it receives and sends back what the user intends.
4. **Local and private.** The user's code and reviews stay on their machine.
