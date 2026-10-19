# The demo

`/demo/` lists the demo repositories, and `/demo/<name>/` opens one of them in the real Flight Plan app. The site is static, so the whole app runs in the visitor's browser: the frontend's own router and pages, and the backend's own tRPC router and procedures, on stores kept in memory. Nothing a visitor does leaves the browser, and a reload starts the demo over.

## Where the demos come from

Every playground fixture whose folder name starts with `demo-` is a demo. Today these are `tools/playground-fixtures/test-cases/demo-react/`, `demo-vue/` and `demo-fastapi/`.

A demo uses the fixture's review artifact as it is, and adds a `demo.json` beside the fixture's `meta.json`. It describes the pull request around the review:

| Field | What it holds |
|---|---|
| `repository` | The repository's name in the app and its GitHub slug. |
| `pullRequest` | Its number, its author and how many minutes ago it was updated. |
| `reviewers` | Each reviewer's login and state: `pending`, `commented`, `approved` or `changes-requested`. |
| `comments` | Comments on the pull request itself. |
| `threads` | Comment threads on a line of a changed file: the path, the line in the new file, whether the thread is resolved, and its comments. |
| `reviews` | Submitted reviews, each with a verdict: `comment`, `approve` or `request-changes`. |
| `chat` | The conversation with the agent the chat panel opens with. |
| `agentReplies` | What the agent answers when a visitor sends a message, in turn. |
| `avatars` | The avatar of each person, by login: a path the site serves, such as `/demo-avatars/gilfoyle.svg`. A person without one gets the app's monogram. |

Every comment, review and chat message carries `minutesAgo`, so the demo always reads as recent. The format is checked by `demoStorySchema` in `apps/backend/src/procedures/get-review/utils/mocks/demo-reviews.ts`.

## Adding a demo repository

1. Add a playground kind named `demo-<something>` with its case repository and one snapshot, following `tools/playground-fixtures/docs/playground.md`.
2. Add its `demo.json`. Point each thread at a line the change adds, so it sits next to code the review explains.
3. Run `nx build site`. The selection page lists the new demo with the framework from `meta.json`.

## How it is built

`nx build site` runs two steps first:

- `site:build-demo-data` compiles `apps/site/demo/data/write-demo-data.ts` with esbuild and runs it. It turns every demo fixture into a review artifact with the playground's `getReviewArtifactFixture`, and writes it with its story to `apps/site/public/demo-data/<name>.json`, plus an `index.json` for the selection page.
- `site:build-demo` builds `apps/site/demo/app/` with Vite into `apps/site/public/demo-app/`.

The demo app mounts the frontend's `createApp` with a hash history, so a demo's address keeps the app's path after `#`. Its tRPC client calls the backend's `appRouter` through tRPC's local link, with the context from `createDemoProcedureContext` in `apps/backend/src/procedures/context.ts`. That context holds:

- the demo repositories as GitHub repositories, and their reviews;
- an in-memory GitHub forge with the reviewers, threads and reviews of each story, so comments, replies, resolving threads, review requests and submitted reviews all work;
- a completed setup with Claude as the agent;
- a demo agent that answers each chat message with the next scripted reply, through the same procedures a real agent's tools call.

A link between the client and the router copies every input and result through JSON, so the app receives exactly what it would over HTTP.

The backend code is bundled for the browser with two adjustments in `apps/site/demo/vite.config.mts`. Modules that only work in Node, such as tree-sitter, node-pty and Fastify, are replaced by stubs that throw if called; the demo never calls them. `node:crypto` is replaced by `apps/site/demo/app/node-crypto.ts`, a SHA-1 that gives the same fingerprints as Node's.

Links to a demo repository on GitHub stay on the page and show a note, because those repositories do not exist. The logo in the app's header leaves the demo for the site's home page at `/`.
