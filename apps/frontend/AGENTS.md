# apps/frontend

The React 19 single-page app. It renders what the backend returns and sends user intent back. It holds no business logic. Read [architecture](../../docs/agents/architecture.md) and [react](../../docs/agents/react.md) before changing anything here.

## Rules

- **Render only.** No filtering, sorting, grouping, counting, deriving, validating or formatting of domain data. If the UI needs a value the response does not have, change the backend.
- **Allowed state is view state**: open or closed, active tab, hover, focus, input text, and URL params.
- **The review page raises the completion notification the backend words.** `-hooks/use-completion-notification.ts` remembers that the page showed a review's `progress`, and when the same review then arrives with a `completion`, it shows its title as a toast and raises a browser notification with its title and body. A click focuses the page. The permission is asked for in the click that makes a review request. The review query keeps refetching in a background tab, because that is where the notification matters.
- **The published copy of a Flight Plan is a second entry, `src/published/`, that never talks to the backend.** `vite.published.config.mts` builds `src/published/main.tsx` into one script and one stylesheet (`nx run frontend:build-published`, into `dist/apps/published-review`), with the fonts and the logo inlined, which the backend puts beside the review's data when a Flight Plan is published as a Claude artifact. The page reads the review from `window.flightPlanReview`, which the `review-data.js` the backend wrote sets, and draws it with the components of the reviewer's page. It imports no router, no tRPC and no TanStack Query. A control that would need the backend is given the handler that opens the dialog the review words in `unavailableFeature`. Its type is the output of `review.published`.
- **`/artifact/claude/download` starts a download in its loader, not in an effect.** The loader reads `review.importForm` and, when the form says `startsAtOnce`, runs `review.import` once through the mutation cache, so a second render cannot start a second one. The page follows the import the loader or a press started, refetches the form while it waits, and navigates to the review page when the form says that import is finished.
- **The review page draws an offer where a section was not generated.** A segment's `offers` holds one for the Journey Flow Diagram, the Blast Diagram and the findings, each `null` while its section is generated. The page draws `GenerationOffer` in place of the Journey Flow Diagram band, where the Blast Diagram band would be, and above the files of the Code Walkthrough. `-hooks/use-section-generation.ts` runs `review.generateSection`, copies the prompt the backend returns, reads the review again and shows the backend's message as a toast. The published copy draws the same offers and opens its "only in Flight Plan" dialog on a press.
- **Only route files talk to the backend**, through `useTRPC()` with TanStack Query and route loaders. Components get data and callbacks through props.
- **No shared components here.** A component used by more than one page moves to `packages/ui`.
- **A hook that more than one route uses** lives in `src/` next to `trpc.ts`, and only route files call it. `repository-finder.ts` holds the folder search and browse state of the Add repository dialog, which the index and the setup page share, and `authors-choice.ts` holds the chosen users and the user search of that dialog and of the Configure repository dialog. `settings-saving.ts` holds the save of a settings page: the mutation, the problem of a rejected save and the confirmation of a saved one.
- **`import type { AppRouter }` only** from `@flightplan/backend/router`. Nothing else comes from the backend.
- **Development-only UI is rendered behind `import.meta.env.DEV`**, written inline where it is rendered (`{import.meta.env.DEV && index.fixtures !== null ? … : null}`), so the production build drops it. The Fixtures section of the index page is the one case: it renders `fixtures` of `repository.list` with the same `RepositoryLine` as a real repository, and its select puts the chosen test case in the `fixtureCase` search parameter. A fixture gets no component of its own.
- **The settings pages are one route file each under `routes/settings/`**, with `route.tsx` as their layout (the heading, the list of pages and the outlet) and `index.tsx` redirecting `/settings` to `/settings/agents`. Each page reads `settings.get` for its section and saves with `settings.save`. The forms themselves (`AgentsForm`, `ForgesForm`, `DefaultConfigurationForm`) are in `packages/ui`, because the setup steps draw the same forms: a setup step wraps one with its intro and its "Back" and "Save and continue", a settings page with its intro and "Save". The repositories page uses the `repository.*` routes of the index page.
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
