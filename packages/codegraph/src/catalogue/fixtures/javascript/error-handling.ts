import type { PatternFixture } from "@/catalogue/types"

const REACT_ERROR_BOUNDARY = "react-error-boundary"

export const reactErrorBoundaryFixtures: readonly PatternFixture[] = [
  {
    library: REACT_ERROR_BOUNDARY,
    patternKey: "element:ErrorBoundary:*",
    matches: [
      "import { ErrorBoundary } from \"react-error-boundary\"\nconst app = <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <button onClick={resetErrorBoundary}>Try again</button>} onReset={clearCart}><Cart /></ErrorBoundary>",
      "import { ErrorBoundary } from \"react-error-boundary\"\nconst app = <ErrorBoundary FallbackComponent={CartFallback} onError={reportError}><Cart /></ErrorBoundary>",
    ],
    rejects: [
      "const ErrorBoundary = (props) => props.children\nconst app = <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <button onClick={resetErrorBoundary}>Try again</button>} onReset={clearCart}><Cart /></ErrorBoundary>",
    ],
  },
  {
    library: REACT_ERROR_BOUNDARY,
    patternKey: "call:useErrorBoundary:*",
    matches: [
      "import { useErrorBoundary } from \"react-error-boundary\"\nconst { showBoundary } = useErrorBoundary()",
    ],
    rejects: [
      "const useErrorBoundary = () => ({ showBoundary: () => null })\nconst { showBoundary } = useErrorBoundary()",
    ],
  },
  {
    library: REACT_ERROR_BOUNDARY,
    patternKey: "call:withErrorBoundary:*",
    matches: [
      "import { withErrorBoundary } from \"react-error-boundary\"\nconst SafeCart = withErrorBoundary(Cart, { fallbackRender: ({ error }) => <p>{error.message}</p> })",
      "import { withErrorBoundary } from \"react-error-boundary\"\nconst SafeCart = withErrorBoundary(Cart, { FallbackComponent: CartFallback })",
    ],
    rejects: [
      "const withErrorBoundary = (component, options) => component\nconst SafeCart = withErrorBoundary(Cart, { fallbackRender: ({ error }) => <p>{error.message}</p> })",
    ],
  },
]

const NEVERTHROW = "NeverThrow"

export const neverThrowFixtures: readonly PatternFixture[] = [
  {
    library: NEVERTHROW,
    patternKey: "call:err:*",
    matches: [
      "import { err, ok } from \"neverthrow\"\nconst parsePort = (input) => (Number(input) > 0 ? ok(Number(input)) : err(\"Invalid port\"))",
    ],
    rejects: [
      "const err = (error) => ({ error })\nconst parsePort = (input) => (Number(input) > 0 ? ok(Number(input)) : err(\"Invalid port\"))",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:errAsync:*",
    matches: [
      "import { errAsync } from \"neverthrow\"\nconst addUser = (user) => errAsync(new Error(\"Username is too short\"))",
    ],
    rejects: [
      "const errAsync = (error) => Promise.reject(error)\nconst addUser = (user) => errAsync(new Error(\"Username is too short\"))",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:fromThrowable:*",
    matches: [
      "import { fromThrowable } from \"neverthrow\"\nconst safeJsonParse = fromThrowable(JSON.parse, (error) => \"Parse error: \" + error)",
    ],
    rejects: [
      "const fromThrowable = (fn, onError) => fn\nconst safeJsonParse = fromThrowable(JSON.parse, (error) => \"Parse error: \" + error)",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:fromAsyncThrowable:*",
    matches: [
      "import { fromAsyncThrowable } from \"neverthrow\"\nconst safeQuery = fromAsyncThrowable(async (query) => database.execute(query), (error) => ({ type: \"DB_ERROR\", message: String(error) }))",
    ],
    rejects: [
      "const fromAsyncThrowable = (fn, onError) => fn\nconst safeQuery = fromAsyncThrowable(async (query) => database.execute(query), (error) => ({ type: \"DB_ERROR\", message: String(error) }))",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:fromPromise:*",
    matches: [
      "import { fromPromise } from \"neverthrow\"\nconst saved = fromPromise(insertIntoDb(user), () => new Error(\"Database error\"))",
    ],
    rejects: [
      "const fromPromise = (promise, onError) => promise\nconst saved = fromPromise(insertIntoDb(user), () => new Error(\"Database error\"))",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:safeTry:*",
    matches: [
      "import { safeTry, ok } from \"neverthrow\"\nconst total = safeTry(function* () {\n  const prices = yield* fetchPrices(items)\n  return ok(prices.length)\n})",
    ],
    rejects: [
      "const safeTry = (body) => body().next().value\nconst total = safeTry(function* () {\n  const prices = yield* fetchPrices(items)\n  return ok(prices.length)\n})",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:Result.fromThrowable:*",
    matches: [
      "import { Result } from \"neverthrow\"\nconst safeJsonParse = Result.fromThrowable(JSON.parse, () => ({ message: \"Parse Error\" }))",
    ],
    rejects: [
      "const Result = { fromThrowable: (fn) => fn }\nconst safeJsonParse = Result.fromThrowable(JSON.parse, () => ({ message: \"Parse Error\" }))",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:ResultAsync.fromThrowable:*",
    matches: [
      "import { ResultAsync } from \"neverthrow\"\nconst safeFetch = ResultAsync.fromThrowable(async (url) => (await fetch(url)).json(), (error) => \"Request failed: \" + error)",
    ],
    rejects: [
      "const ResultAsync = { fromThrowable: (fn) => fn }\nconst safeFetch = ResultAsync.fromThrowable(async (url) => (await fetch(url)).json(), (error) => \"Request failed: \" + error)",
    ],
  },
  {
    library: NEVERTHROW,
    patternKey: "call:ResultAsync.fromPromise:*",
    matches: [
      "import { ResultAsync } from \"neverthrow\"\nconst saved = ResultAsync.fromPromise(insertIntoDb(user), () => new Error(\"Database error\"))",
    ],
    rejects: [
      "const ResultAsync = { fromPromise: (promise) => promise }\nconst saved = ResultAsync.fromPromise(insertIntoDb(user), () => new Error(\"Database error\"))",
    ],
  },
]

const BETTER_RESULT = "better-result"

export const betterResultFixtures: readonly PatternFixture[] = [
  {
    library: BETTER_RESULT,
    patternKey: "call:Result.try:*",
    matches: [
      "import { Result } from \"better-result\"\nconst parsed = Result.try(() => JSON.parse(body))",
      "import { Result } from \"better-result\"\nconst parsed = Result.try({ try: () => JSON.parse(body), catch: (cause) => new ParseError({ cause }) })",
    ],
    rejects: [
      "const Result = { try: (fn) => fn() }\nconst parsed = Result.try(() => JSON.parse(body))",
    ],
  },
  {
    library: BETTER_RESULT,
    patternKey: "call:Result.tryPromise:*",
    matches: [
      "import { Result } from \"better-result\"\nconst response = await Result.tryPromise(() => fetch(url))",
      "import { Result } from \"better-result\"\nconst response = await Result.tryPromise({ try: ({ signal }) => fetch(url, { signal }), catch: (cause) => new NetworkError({ cause, url }) }, { retry: { times: 3, delayMs: 100 } })",
    ],
    rejects: [
      "const Result = { tryPromise: (fn) => fn() }\nconst response = await Result.tryPromise(() => fetch(url))",
    ],
  },
  {
    library: BETTER_RESULT,
    patternKey: "call:Result.gen:*",
    matches: [
      "import { Result } from \"better-result\"\nconst checkout = (cartId) => Result.gen(function* () {\n  const cart = yield* findCart(cartId)\n  return Result.ok(cart)\n})",
    ],
    rejects: [
      "const Result = { gen: (body) => body().next().value, ok: (value) => value }\nconst checkout = (cartId) => Result.gen(function* () {\n  const cart = yield* findCart(cartId)\n  return Result.ok(cart)\n})",
    ],
  },
  {
    library: BETTER_RESULT,
    patternKey: "call:Result.err:*",
    matches: [
      "import { Result } from \"better-result\"\nconst parsePort = (input) => (Number(input) > 0 ? Result.ok(Number(input)) : Result.err(new InvalidPort({ input })))",
    ],
    rejects: [
      "const Result = { ok: (value) => value, err: (error) => error }\nconst parsePort = (input) => (Number(input) > 0 ? Result.ok(Number(input)) : Result.err(new InvalidPort({ input })))",
    ],
  },
  {
    library: BETTER_RESULT,
    patternKey: "call:TaggedError:*",
    matches: [
      "import { TaggedError } from \"better-result\"\nclass InvalidPort extends TaggedError(\"InvalidPort\") {}",
    ],
    rejects: [
      "const TaggedError = (tag) => class extends Error {}\nclass InvalidPort extends TaggedError(\"InvalidPort\") {}",
    ],
  },
]

const OPOSSUM = "Opossum"

export const opossumFixtures: readonly PatternFixture[] = [
  {
    library: OPOSSUM,
    patternKey: "factory:default:*",
    matches: [
      "import CircuitBreaker from \"opossum\"\nconst breaker = new CircuitBreaker(async (orderId) => paymentService.charge(orderId), { timeout: 3000 })",
    ],
    rejects: [
      "const CircuitBreaker = (...parts) => parts\nconst breaker = new CircuitBreaker(async (orderId) => paymentService.charge(orderId), { timeout: 3000 })",
    ],
  },
  {
    library: OPOSSUM,
    patternKey: "factory:default:*>call:fire:*",
    matches: [
      "import CircuitBreaker from \"opossum\"\nconst breaker = new CircuitBreaker(chargeOrder, { timeout: 3000 })\nconst receipt = await breaker.fire(orderId)",
    ],
    rejects: [
      "const breaker = makeLocalRegistry()\nconst receipt = await breaker.fire(orderId)",
    ],
  },
  {
    library: OPOSSUM,
    patternKey: "factory:default:*>call:fallback:*",
    matches: [
      "import CircuitBreaker from \"opossum\"\nconst breaker = new CircuitBreaker(chargeOrder, { timeout: 3000 })\nbreaker.fallback(() => \"Sorry, out of service right now\")",
    ],
    rejects: [
      "const breaker = makeLocalRegistry()\nbreaker.fallback(() => \"Sorry, out of service right now\")",
    ],
  },
  {
    library: OPOSSUM,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "import CircuitBreaker from \"opossum\"\nconst breaker = new CircuitBreaker(chargeOrder, { timeout: 3000 })\nbreaker.on(\"fallback\", (result) => reportFallbackEvent(result))",
    ],
    rejects: [
      "const breaker = makeLocalRegistry()\nbreaker.on(\"fallback\", (result) => reportFallbackEvent(result))",
    ],
  },
]

const TRUE_MYTH = "True Myth"

export const trueMythFixtures: readonly PatternFixture[] = [
  {
    library: TRUE_MYTH,
    patternKey: "call:tryOrElse@true-myth/result:*",
    matches: [
      "import * as result from \"true-myth/result\"\nconst renamed = result.tryOrElse((error) => new Error(\"Rename failed\", { cause: error }), () => fs.renameSync(\"original\", \"updated\"))",
    ],
    rejects: [
      "const result = { tryOrElse: (onError, fn) => fn() }\nconst renamed = result.tryOrElse((error) => new Error(\"Rename failed\", { cause: error }), () => fs.renameSync(\"original\", \"updated\"))",
    ],
  },
  {
    library: TRUE_MYTH,
    patternKey: "call:safe@true-myth/result:*",
    matches: [
      "import * as result from \"true-myth/result\"\nconst rename = result.safe(fs.renameSync)",
    ],
    rejects: [
      "const result = { safe: (fn) => fn }\nconst rename = result.safe(fs.renameSync)",
    ],
  },
  {
    library: TRUE_MYTH,
    patternKey: "call:default.tryOrElse@true-myth/task:*",
    matches: [
      "import Task from \"true-myth/task\"\nconst loaded = Task.tryOrElse(fetchUser(id), (reason) => new Error(\"Promise was rejected\", { cause: reason }))",
    ],
    rejects: [
      "const Task = { tryOrElse: (promise) => promise }\nconst loaded = Task.tryOrElse(fetchUser(id), (reason) => new Error(\"Promise was rejected\", { cause: reason }))",
    ],
  },
]
