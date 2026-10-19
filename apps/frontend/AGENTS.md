# apps/frontend

The React 19 single-page app. It renders what the backend returns and sends user intent back. It holds no business logic. Read [architecture](../../docs/agents/architecture.md) and [react](../../docs/agents/react.md) before changing anything here.

## Rules

- **Render only.** No filtering, sorting, grouping, counting, deriving, validating or formatting of domain data. If the UI needs a value the response does not have, change the backend.
- **Allowed state is view state**: open or closed, active tab, hover, focus, input text, and URL params.
- **The review page raises the completion notification the backend words.** `-hooks/use-completion-notification.ts` remembers that the page showed a review's `progress`, and when the same review then arrives with a `completion`, it shows its title as a toast and raises a browser notification with its title and body. A click focuses the page. The permission is asked for in the click that makes a review request. The review query keeps refetching in a background tab, because that is where the notification matters.
- **The published copy of a Flight Plan is a second entry, `src/published/`, that never talks to the backend.** `vite.published.config.mts` builds `src/published/main.tsx` into one script and one stylesheet (`nx run frontend:build-published`, into `dist/apps/published-review`), with the fonts and the logo inlined, which the backend puts beside the review's data when a Flight Plan is published as a Claude artifact. The page reads the review from `window.flightPlanReview`, which the `review-data.js` the backend wrote sets, and draws it with the components of the reviewer's page. It imports no router, no tRPC and no TanStack Query. A control that would need the backend is given the handler that opens the dialog the review words in `unavailableFeature`. Marking as reviewed and showing the reviewed are the exception: `published/use-reviewed-marks.ts` keeps the marks in `localStorage` under the key `reviewed.storageKey` names, every read and write wrapped so a blocked or unreadable storage reads as no marks, and draws each segment through `@flightplan/reviewed-marks`, the calculation the backend runs, over the outline the review carries in `reviewed`. Its type is the output of `review.published`.
- **`/artifact/claude/download` starts a download in its loader, not in an effect.** The loader reads `review.importForm` and, when the form says `startsAtOnce`, runs `review.import` once through the mutation cache, so a second render cannot start a second one. The page follows the import the loader or a press started, refetches the form while it waits, and navigates to the review page when the form says that import is finished.
- **The chat panel follows the conversation through a subscription.** `-hooks/use-agent-chat.ts` holds whether the panel is open and the code reference waiting for the next message, subscribes to `conversation.watch` with `useSubscription` while the panel is open, reads `conversation.modelChoice`, and sends with `conversation.sendMessage`, `conversation.answerQuestions` and `conversation.chooseModel`. A rejected message or answer is shown in the panel, under the composer or the question batch it belongs to. In tests, `fakeBackendLinks` answers a subscription with the one reply its handler gives.
- **Only route files talk to the backend**, through `useTRPC()` with TanStack Query and route loaders. Components get data and callbacks through props.
- **No shared components here.** A component used by more than one page moves to `packages/ui`.
- **A hook that more than one route uses** lives in `src/` next to `trpc.ts`, and only route files call it. `repository-finder.ts` holds the folder search and browse state of the Add repository dialog, which the index and the setup page share, and `authors-choice.ts` holds the chosen users and the user search of that dialog and of the Configure repository dialog. `settings-saving.ts` holds the save of a settings page: the mutation, the problem of a rejected save and the confirmation of a saved one.
- **`import type { AppRouter }` only** from `@flightplan/backend/router`. Nothing else comes from the backend.
- **Development-only UI is rendered behind `import.meta.env.DEV`**, written inline where it is rendered (`{import.meta.env.DEV && index.fixtures !== null ? … : null}`), so the production build drops it. The Fixtures section of the index page is the one case: it renders `fixtures` of `repository.list` with the same `RepositoryLine` as a real repository, and its select puts the chosen test case in the `fixtureCase` search parameter. A fixture gets no component of its own.
- **The settings pages are one route file each under `routes/settings/`**, with `route.tsx` as their layout (the heading, the list of pages and the outlet) and `index.tsx` redirecting `/settings` to `/settings/agents`. Each page reads `settings.get` for its section and saves with `settings.save`. The forms themselves (`AgentsForm`, `ForgesForm`) are in `packages/ui`, because the setup steps draw the same forms: a setup step wraps one with its intro and its "Back" and "Save and continue", a settings page with its intro and "Save". The repositories page uses the `repository.*` routes of the index page. The Review configuration step's `ReviewConfigurationForm` is in `packages/ui` too; its "Finish setup" saves the review preferences with `reviewPreferences.save` before `setup.saveStep`.
- **The configurations pages are `routes/settings/profiles/`**: `index.tsx` (the list), `create.tsx` and `$id.tsx` (one configuration), with their components in `-components/` beside them. On `$id` the settings layout leaves its list out and the page draws `FieldIndex` in that column. The open entry of the index is the `field` search parameter, which the page sends to `configuration.get`; the backend says which entry is open and what its mark is. A field is edited with `TextEditor` of `packages/ui`, given no code link dialog, so it has no code link control. Each panel saves on its own with `configuration.save`, and a reset remounts the editor so that it shows the preset's text.
- Import UI components as default imports by their path: `import Button from "@flightplan/ui/blocks/button"`.
- Navigate with TanStack Router `<Link>` so intent preloading works.

## Layout

```
src/
  main.tsx                     creates the query client, tRPC client and router once, then renders
  router.ts, trpc.ts
  routes/                      TanStack Router file routes; each route file is its page (URL, loader, component)
  routes/**/-components/<ComponentName>/index.tsx   components of the page next to it, left out of the route tree
  routes/**/__tests__/, routes/**/-components/<ComponentName>/__tests__/
  routeTree.gen.ts             generated by the router plugin, committed, never edited
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p frontend ui`
- Run `pnpm dev`, then check the change in a browser with `agent-browser`, following [testing](../../docs/agents/testing.md#ui-verification-with-agent-browser). Check loading, empty and error states and the browser console.
