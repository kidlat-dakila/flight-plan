import { vi } from "vitest"
import type { Fetcher } from "@/git-adapter/types"

export interface RecordingFetcher {
  readonly fetcher: Fetcher
  readonly urls: () => string[]
  readonly headers: () => Headers[]
}

export const recordFetches = (answer: Fetcher): RecordingFetcher => {
  const fetcher = vi.fn<Fetcher>(answer)
  return {
    fetcher,
    urls: () => fetcher.mock.calls.map(([input]) => input),
    headers: () => fetcher.mock.calls.map(([, init]) => new Headers(init?.headers)),
  }
}
