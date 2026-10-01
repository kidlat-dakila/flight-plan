import { httpLink, type TRPCLink } from "@trpc/client"
import type { AppRouter } from "@flightplan/backend/router"

export type ProcedureReply = { readonly data: unknown } | { readonly errorMessage: string }

export type ProcedureHandlers = Readonly<Partial<Record<string, (input: unknown) => ProcedureReply>>>

const FAKE_BACKEND_URL = "http://backend.test/api/trpc"
const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const JSON_RPC_BAD_REQUEST = -32600

const urlOf = (request: RequestInfo | URL): URL => new URL(request instanceof Request ? request.url : request.toString())

const procedurePathOf = (url: URL): string => url.pathname.split("/").at(-1) ?? ""

const SETUP_COMPLETE_HANDLERS: ProcedureHandlers = {
  "setup.gate": () => ({ data: { redirectTo: null } }),
}

const queryInputOf = (url: URL): unknown => {
  const encodedInput = url.searchParams.get("input")
  return encodedInput === null ? undefined : JSON.parse(encodedInput)
}

const inputOf = (url: URL, body: unknown): unknown => (typeof body === "string" ? JSON.parse(body) : queryInputOf(url))

const toResponse = (path: string, reply: ProcedureReply): Response =>
  "data" in reply
    ? Response.json({ result: { data: reply.data } })
    : Response.json(
        {
          error: {
            message: reply.errorMessage,
            code: JSON_RPC_BAD_REQUEST,
            data: { code: "BAD_REQUEST", httpStatus: HTTP_BAD_REQUEST, path },
          },
        },
        { status: HTTP_BAD_REQUEST },
      )

const answer = (handlers: ProcedureHandlers, url: URL, body: unknown): Response => {
  const path = procedurePathOf(url)
  const handler = handlers[path]
  return handler ? toResponse(path, handler(inputOf(url, body))) : new Response(null, { status: HTTP_NOT_FOUND })
}

export const fakeBackendLinks = (handlers: ProcedureHandlers): TRPCLink<AppRouter>[] => [
  httpLink({
    url: FAKE_BACKEND_URL,
    fetch: async (input, init) =>
      await Promise.resolve(answer({ ...SETUP_COMPLETE_HANDLERS, ...handlers }, urlOf(input), init?.body)),
  }),
]
