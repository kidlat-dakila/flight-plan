import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "~/server/root"
import { createContext } from "~/server/trpc"

export function handleTrpcRequest(req: Request): Promise<Response> {
  return fetchRequestHandler({ endpoint: "/trpc", req, router: appRouter, createContext: () => createContext({ req }) })
}
