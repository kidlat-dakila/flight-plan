# The demo

`/demo/` lists the demo repositories, and `/demo/<name>/` opens one of them in the real Flight Plan app. The site is static, so the whole app runs in the visitor's browser: the frontend's own router and pages, and the backend's own tRPC router and procedures, on stores kept in memory. Nothing a visitor does leaves the browser, and a reload starts the demo over.

## Where the demos come from

Every playground fixture whose folder name starts with `demo-` is a demo. Today these are `tools/playground-fixtures/test-cases/demo-react/`, `demo-vue/`, `demo-nextjs/`, `demo-t3/` and `demo-fastapi/`.

A demo uses the fixture's review artifact as it is, with segments off as the default review preferences have them, and adds a `demo.json` beside the fixture's `meta.json`. It describes the pull request around the review:

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

`nx dev site`, which `pnpm dev` also runs, builds the demo data once and then runs `site:watch-demo` beside `astro dev`. It is the same Vite build in watch mode, so a change to the frontend, the backend or a package rebuilds `apps/site/public/demo-app/`, and reloading the demo shows it. A change to a demo fixture needs `nx dev site` started again.

The demo app mounts the frontend's `createApp` with a hash history, so a demo's address keeps the app's path after `#`. Its tRPC client calls the backend's `appRouter` through tRPC's local link, with the context from `createDemoProcedureContext` in `apps/backend/src/procedures/context.ts`. That context holds:

- the demo repositories as GitHub repositories, and their reviews, each stored as explained by Claude, so a review opens without asking whether Claude should explain it;
- an in-memory GitHub forge with the reviewers, threads and reviews of each story, so comments, replies, resolving threads, review requests and submitted reviews all work;
- a completed setup with Claude as the agent;
- the instructions that ship with Flight Plan, so the Prompt configurations pages show each preset's real text. `apps/site/demo/app/instruction-texts.ts` bundles the Markdown files of `packages/configurations/src/system-instructions/` and `default-configurations/` into the demo app;
- a demo agent that answers each chat message with the next scripted reply, through the same procedures a real agent's tools call. Explain in the ⚙ menu starts it too: it sends its reply and marks the review complete again, since every part is already written.

A link between the client and the router copies every input and result through JSON, so the app receives exactly what it would over HTTP.

The backend code is bundled for the browser with two adjustments in `apps/site/demo/vite.config.mts`. Modules that only work in Node, such as tree-sitter and Fastify, are replaced by stubs that throw if called; the demo never calls them. `node:crypto` is replaced by `apps/site/demo/app/node-crypto.ts`, a SHA-1 that gives the same fingerprints as Node's.

## The demo notice

A demo opens with a dialog, "Thanks for checking out Flight Plan!", that says the page is a demo running in the browser and shows the commands that install Flight Plan, from the backend's `INSTALL_GUIDE`. It is the frontend's `UnavailableFeatureDialog`, the one a published Flight Plan shows. `apps/site/demo/app/demo-notice.tsx` holds its text and its store.

The dialog opens again after each write a visitor makes: submitting a review, adding a comment, replying to or resolving a thread, ticking a file or a waypoint as reviewed, and requesting or removing a reviewer. `afterDemoWriteLink` in `apps/site/demo/app/demo-write-link.ts` sits in the tRPC client's links and opens it once one of these mutations has succeeded, so the visitor sees what they did under the dialog.

Writing `off` to the local storage key `flightplan-demo-notice` turns the dialog off. The capture scripts do, so it never covers a recording.

Links to a demo repository on GitHub stay on the page and show a note, because those repositories do not exist. The logo in the app's header leaves the demo for the site's home page at `/`.
