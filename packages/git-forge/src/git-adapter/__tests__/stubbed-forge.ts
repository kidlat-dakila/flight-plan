import { vi } from "vitest"
import type { Fetcher } from "@/git-adapter/types"

export interface ForgeCall {
  readonly method: string
  readonly url: string
  readonly body: unknown
}

export interface StubbedForge {
  readonly fetcher: Fetcher
  readonly calls: () => ForgeCall[]
  readonly writes: () => ForgeCall[]
}

type Answer = (call: ForgeCall) => unknown

const JSON_HEADERS = { "content-type": "application/json" }
const READ_METHOD = "GET"
const GRAPHQL_SUFFIX = "/graphql"

const parseBody = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const readCall = async (input: string | URL | Request, init: RequestInit | undefined): Promise<ForgeCall> => {
  if (input instanceof Request) {
    const text = await input.clone().text()
    return { method: input.method, url: input.url, body: text === "" ? null : parseBody(text) }
  }
  const text = typeof init?.body === "string" ? init.body : ""
  return { method: (init?.method ?? READ_METHOD).toUpperCase(), url: String(input), body: text === "" ? null : parseBody(text) }
}

const toResponse = (answer: unknown): Response => {
  if (answer instanceof Response) return answer
  return typeof answer === "string"
    ? new Response(answer, { status: 200 })
    : new Response(JSON.stringify(answer), { status: 200, headers: JSON_HEADERS })
}

const isWrite = (call: ForgeCall): boolean =>
  call.method !== READ_METHOD && !(call.url.endsWith(GRAPHQL_SUFFIX) && !JSON.stringify(call.body).includes("mutation"))

export const stubForge = (answer: Answer): StubbedForge => {
  const record = vi.fn<(call: ForgeCall) => void>()
  const received = (): ForgeCall[] => record.mock.calls.map(([call]) => call)
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call = await readCall(input, init)
    record(call)
    return toResponse(answer(call))
  })
  return { fetcher, calls: received, writes: () => received().filter(isWrite) }
}

export const refusal = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
