import { normalizeError } from "@agntn/forges"

export type RequestOptions = {
  query?: Record<string, unknown>
  headers?: Record<string, string>
  responseType?: "text" | "json"
}

export type ProviderClient = {
  (path: string, options?: RequestOptions): Promise<unknown>
  raw: (
    path: string,
    options?: RequestOptions,
  ) => Promise<{ _data: unknown; headers: Headers }>
}

export async function guarded<T>(platform: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (cause) {
    throw normalizeError(cause, platform)
  }
}
