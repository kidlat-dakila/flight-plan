# React

React performance and correctness rules for `apps/frontend` and `packages/ui`. They are adapted from Vercel's React best practices, with everything specific to Next.js and server rendering removed. Flight Plan is a client-rendered React 19 single-page app built with Vite, TanStack Router, TanStack Query and tRPC.

These rules sit under the [architecture](architecture.md) rule: **the frontend only renders**. Where a general React rule would filter, sort or derive data in a component, the fix here is to move that work to the backend and render the result.

Rules are grouped by impact, most important first.

## 1. Eliminate waterfalls (critical)

A waterfall is a request that waits for another request it does not depend on. Each one adds a full network round trip.

### Fetch in parallel, not parent-then-child

Do not let a child component start its query only after its parent's query resolves when the two are independent. Start both at the page level, or prefetch in the route loader.

Incorrect: `FileList` mounts only after the review loads, so its query starts late.

```tsx
const ReviewPage = ({ reviewId }: ReviewPageProps) => {
  const trpc = useTRPC()
  const review = useQuery(trpc.review.get.queryOptions({ reviewId }))
  if (!review.data) return <PageSkeleton />
  return <FileList reviewId={reviewId} />
}
```

Correct: the route loader starts every independent query at once, and components read the cache.

```tsx
export const Route = createFileRoute("/pr-reviews/$repoName/$branchId")({
  loader: ({ context: { queryClient, trpc }, params }) =>
    Promise.all([
      queryClient.query({ ...trpc.review.get.queryOptions(params), staleTime: "static" }),
      queryClient.query({ ...trpc.review.files.queryOptions(params), staleTime: "static" }),
    ]),
  component: ReviewPage,
})
```

The loader calls `queryClient.query` with `staleTime: "static"`, which returns cached data when there is some and fetches when there is none. `queryClient.ensureQueryData` is deprecated, and lint rejects it. The router gets `queryClient` and `trpc` through its context, which `createApp` in `apps/frontend/src/app.tsx` provides.

If the second request really does depend on the first, prefer one backend procedure that returns both. The backend can run the dependent calls without a browser round trip in between.

### Use Suspense boundaries to show the layout early

Do not block the whole page on data that only one section needs. Wrap that section in `<Suspense>` and read it with `useSuspenseQuery`. The header, navigation and other sections render right away.

```tsx
const ReviewPage = () => (
  <ReviewLayout header={<ReviewHeader />}>
    <Suspense fallback={<BlastDiagramSkeleton />}>
      <BlastDiagramSection />
    </Suspense>
  </ReviewLayout>
)
```

Do not use this when the data decides the layout itself, or when the query is so fast that the fallback only adds a flash of layout shift.

### Promise rules in any async code

These apply in the frontend and even more in the backend (see [fastify](fastify.md#async-and-waterfalls)):

- Use `Promise.all` for independent operations.
- Start promises early and await them late.
- Move an `await` into the branch that actually uses the result.
- Check cheap synchronous conditions before awaiting a remote flag.
- For partial dependencies, create the dependent promise with `.then` and await everything together.

## 2. Bundle size (critical)

### Import directly, never through barrel files

Import each module from its own path, not from an `index.ts` that re-exports many modules. Vite serves workspace source unbundled in development, so a barrel makes the browser load every module behind it.

```tsx
import Button from "@flightplan/ui/blocks/button"
```

`@flightplan/ui` has no package root to import from, and you must not create barrel files. Vite pre-bundles third-party dependencies such as `lucide-react`, so named imports from them are fine.

### Split code by route and by heavy feature

- Routes are split automatically (`autoCodeSplitting` in the TanStack Router plugin). Keep route files small so the split stays effective.
- Load heavy components that are not visible on first paint (diagram renderers, syntax highlighters, graph layout libraries) with `React.lazy` and a `Suspense` fallback.
- Load a module only when its feature is turned on: `import()` inside the event or effect that needs it.
- Load non-critical third-party code (analytics, error reporting) after the app has rendered.

```tsx
const JourneyFlowDiagram = lazy(() => import("./JourneyFlowDiagram"))
```

### Preload on intent

The router is created with `defaultPreload: "intent"`, so hovering or focusing a `<Link>` preloads the route's code and loader data. Always navigate with `<Link>` instead of `onClick` plus `navigate` so this keeps working. For a heavy lazy component, trigger its `import()` on hover or focus of the control that opens it.

## 3. Data fetching on the client (medium-high)

- **All server state goes through TanStack Query** via `useTRPC()`. It dedupes identical requests, caches and revalidates. Never call `fetch` in a component, and never copy query data into `useState`.
- Route files call queries and pass data down. Components in `packages/ui` and `routes/**/-components/` receive props and never call queries.
- **Deduplicate global event listeners**: when many component instances need the same `window` or `document` listener, register one listener in a shared hook with a module-level subscriber set rather than one per instance.
- **Use passive listeners** for `scroll`, `touchstart`, `touchmove` and `wheel` when you do not call `preventDefault`: `addEventListener("scroll", onScroll, { passive: true })`.
- **Version and minimise `localStorage`**: store only view preferences (panel widths, collapsed sections), under a versioned key (`flight-plan:layout:v1`), with only the fields you need, read inside `try`/`catch`. Domain data never goes into browser storage.

## 4. Re-renders (medium)

### Never define components inside components

A component defined inside another component is a new type on every render. React unmounts and remounts it, which loses its state and DOM.

```tsx
const FindingBadge = ({ label }: FindingBadgeProps) => <Badge>{label}</Badge>

const FileSection = ({ file }: FileSectionProps) => (
  <section>
    <FindingBadge label={file.findingCountLabel} />
  </section>
)
```

### Compute during render, not in effects

If a value comes from props or state, compute it during render. A `useEffect` that sets state from other state renders twice and can show stale values. In this codebase the value should usually come from the backend already computed, so the component just reads it.

### Put interaction logic in event handlers

Code that runs because the user did something belongs in that event handler, not in an effect that watches state the handler set.

```tsx
const handleSubmit = () => {
  submitReview.mutate({ reviewId })
}
```

### Subscribe to less

- **Defer reads**: do not subscribe to state (search params, stores) that you only read inside a callback. Read it inside the callback.
- **Subscribe to derived booleans**: subscribe to `isWide` rather than the raw `width` when you only need the threshold, so the component re-renders only when the boolean flips. With TanStack Query, use `select` to subscribe to a slice of the data.
- **Narrow effect dependencies**: depend on primitives (`review.id`), not whole objects (`review`).
- **Split combined hooks**: when one `useMemo` or `useEffect` does independent jobs with different dependencies, split it so each job reruns only when its own inputs change.

### Keep state updates cheap and stable

- **Functional `setState`**: `setExpandedPaths((paths) => ...)` when the next value depends on the previous one. The callback then does not depend on the state value.
- **Lazy initial state**: `useState(() => readLayoutPreference())` for anything expensive, so it runs once.
- **Refs for transient values**: values that change often and do not affect output (a pointer position during a drag, a timer ID) go in `useRef`, not state.
- **Transitions for non-urgent updates**: wrap updates that cause heavy re-renders (switching tabs over a large diagram) in `startTransition` so input stays responsive.
- **`useDeferredValue` for expensive renders driven by input**: defer the value you send to the backend search query or pass to a heavy view, and dim the stale result while `value !== deferredValue`.

```tsx
const [query, setQuery] = useState("")
const deferredQuery = useDeferredValue(query)
const results = useQuery(trpc.review.searchFiles.queryOptions({ reviewId, query: deferredQuery }))
const isStale = query !== deferredQuery
```

### Memoisation

- Extract expensive subtrees into components wrapped in `memo` so they skip rendering when their props are unchanged. Make the props stable.
- Hoist default non-primitive props out of memoised components: `const EMPTY_FINDINGS: readonly Finding[] = []` at module level, not `findings = []` in the parameter list.
- Do not wrap simple expressions with primitive results in `useMemo`. The hook costs more than the expression.

## 5. Rendering (medium)

- **Ternaries for conditional rendering**: use `condition ? <A /> : null`, not `count && <A />`, which renders `0`.
- **Hoist static JSX** that never changes (icons, empty-state illustrations) to module-level constants.
- **`<Activity>` for show and hide**: keep expensive panels that toggle often mounted with `<Activity mode={isOpen ? "visible" : "hidden"}>` so their state and DOM survive.
- **`content-visibility: auto`** with `contain-intrinsic-size` for long lists of off-screen sections (file sections in the code walkthrough), so the browser skips layout and paint for them.
- **Animate a wrapper, not the SVG**: apply CSS transforms and animations to a `<div>` around an `<svg>`. Many browsers do not hardware-accelerate animations on SVG elements.
- **Reduce SVG precision**: round coordinates in generated paths (diagram edges) to one or two decimals.
- **`useTransition` over manual loading flags** for state updates that trigger slow renders: use `isPending` instead of a hand-managed `isLoading` state.
- **Resource hints**: use `preload`, `preinit`, `preloadModule` and `preconnect` from `react-dom` for fonts, critical styles and modules you know will be needed.
- **Scripts in `index.html`**: any non-module script uses `defer` or `async` so it does not block parsing.

## 6. JavaScript performance (low-medium)

The frontend should hold very little JavaScript logic, so these rules mostly apply to backend code. Where they apply in the frontend (event handlers, DOM work), follow them.

- **Batch DOM and CSS changes**: toggle a class or set `style.cssText` once instead of setting properties one by one, and do not interleave style reads (`getBoundingClientRect`) with writes.
- **Build index maps** (`nodeById`) for repeated lookups instead of `find` inside a loop.
- **Use `Set` and `Map`** for membership checks instead of `array.includes` on large arrays.
- **Use `toSorted`, `toReversed`, `toSpliced` and `with`** instead of the mutating versions.
- **Return early** once the answer is known.
- **Hoist `RegExp` creation** out of loops and render functions.
- **Combine iterations** when one pass can do the work of several `filter` and `map` calls on a hot path. Use `flatMap` to map and filter in one pass.
- **Check array length first** before an expensive element-by-element comparison.
- **Find min and max with a single loop or `reduce`**, not by sorting.
- **Cache repeated pure function calls** in a module-level `Map` when the same inputs recur, and cache property access in hot loops.
- **Cache `localStorage` reads** in memory. Storage access is synchronous and slow.
- **Defer non-critical work** with `requestIdleCallback`.

## 7. Advanced patterns (low)

- **Initialise once per app load**: app-wide setup (the query client, the tRPC client, the router) runs in `main.tsx`, not in a component effect. Effects run twice in Strict Mode and again on remount.
- **`useEffectEvent` for the latest callback**: when an effect needs the latest version of a callback prop without re-running when it changes, wrap it with `useEffectEvent` and call it inside the effect.
- **Never put an Effect Event in a dependency array**: its identity changes on purpose. Depend on the reactive values only.
- **Stable handler refs**: for handlers passed to long-lived subscriptions, use `useEffectEvent` instead of re-subscribing on every render.

```tsx
const onVisible = useEffectEvent(onSectionVisible)

useEffect(() => {
  const section = sectionRef.current
  if (!section) return
  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) onVisible(sectionId)
  })
  observer.observe(section)
  return () => { observer.disconnect() }
}, [sectionId])
```
