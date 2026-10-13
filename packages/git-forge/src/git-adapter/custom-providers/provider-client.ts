import { normalizeError } from "@agntn/forges"
import type { z } from "zod"
import { GitAdapterError } from "@/git-adapter/types"

export interface RequestOptions {
  query?: Record<string, unknown>
  headers?: Record<string, string>
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: Record<string, unknown>
  responseType?: "text" | "json"
}

export interface ProviderClient {
  (path: string, options?: RequestOptions): Promise<unknown>
  raw: (
    path: string,
    options?: RequestOptions,
  ) => Promise<{ _data: unknown, headers: Headers }>
}

export async function guarded<T>(platform: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (cause) {
    throw normalizeError(cause, platform)
  }
}

export function parseResponse<Schema extends z.ZodType>(
  schema: Schema,
  response: unknown,
  platform: string,
): z.output<Schema> {
  const parsed = schema.safeParse(response)
  if (!parsed.success) {
    throw new GitAdapterError(`${platform} answered with something Flight Plan cannot read.`, "network")
  }
  return parsed.data
}

function isProviderClient(client: unknown): client is ProviderClient {
  return typeof client === "function" && "raw" in client && typeof client.raw === "function"
}

export function toProviderClient(client: unknown): ProviderClient {
  if (!isProviderClient(client)) throw new GitAdapterError("The forge client is not ready.", "unknown")
  return client
}
