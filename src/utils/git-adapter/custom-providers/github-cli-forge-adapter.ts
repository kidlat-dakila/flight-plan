import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { FetchError, type HttpClient } from "@agntn/forges"
import { ExtendedGitHubProvider } from "./extended-github-provider"
import {
  GitAdapterError,
  type GitAdapterProblem,
} from "../../../lib/git-adapter/types"

const execFileAsync = promisify(execFile)

const COMMAND_TIMEOUT_MS = 30_000
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024
const HTTP_ERROR_FLOOR = 400
const CLI_MANAGED_TOKEN = "credentials-held-by-the-github-cli"
const CACHE_SCOPE = Symbol.for("forges.cacheScope")
type HeaderSource = ConstructorParameters<typeof Headers>[0]

const STATUS_LINE = /^HTTP\/\S+\s+(\d{3})\s*(.*)$/

type RequestOptions = {
  query?: Record<string, unknown>
  headers?: HeaderSource
  method?: string
  responseType?: "text" | "json"
}

type IncludedResponse = {
  status: number
  statusText: string
  headers: Headers
  body: string
}

type RawResult = {
  _data: unknown
  headers: Headers
  status: number
  statusText: string
  ok: boolean
}

export function asGitAdapterError(cause: unknown): GitAdapterError {
  const code =
    cause instanceof Error && "code" in cause
      ? String((cause as { code?: unknown }).code)
      : ""
  if (code === "ENOENT") {
    return new GitAdapterError("The GitHub CLI is not installed here.", "no-cli")
  }

  const stderr =
    cause instanceof Error && "stderr" in cause
      ? String((cause as { stderr?: unknown }).stderr).trim()
      : ""
  const message = stderr === "" ? String(cause) : stderr
  return new GitAdapterError(message, classifyProblem(message))
}

function classifyProblem(message: string): GitAdapterProblem {
  const lower = message.toLowerCase()
  if (lower.includes("auth") || lower.includes("not logged in")) return "auth"
  if (lower.includes("not a git repository") || lower.includes("no git remotes")) {
    return "no-repo"
  }
  return "unknown"
}

function parseIncludedResponse(stdout: string): IncludedResponse | null {
  const separator = /\r?\n\r?\n/.exec(stdout)
  if (separator === null) return null
  const head = stdout.slice(0, separator.index).split(/\r?\n/)
  const match = STATUS_LINE.exec(head[0] ?? "")
  if (match === null) return null
  const headers = new Headers()
  for (const line of head.slice(1)) {
    const colon = line.indexOf(":")
    if (colon > 0) headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim())
  }
  return {
    status: Number(match[1]),
    statusText: match[2] ?? "",
    headers,
    body: stdout.slice(separator.index + separator[0].length),
  }
}

function decodeBody(response: IncludedResponse): unknown {
  const isJson = (response.headers.get("content-type") ?? "").includes("json")
  if (!isJson || response.body === "") return response.body
  try {
    return JSON.parse(response.body) as unknown
  } catch {
    return response.body
  }
}

function toRelativePath(path: string): string {
  if (!/^https?:\/\//i.test(path)) return path.replace(/^\/+/, "")
  const url = new URL(path)
  return `${url.pathname}${url.search}`.replace(/^\/+/, "")
}

function buildRequestPath(path: string, query: RequestOptions["query"]): string {
  const relative = toRelativePath(path)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const suffix = params.toString()
  return suffix === "" ? relative : `${relative}${relative.includes("?") ? "&" : "?"}${suffix}`
}

function buildHeaderArgs(headers: HeaderSource): string[] {
  return [...new Headers(headers).entries()].flatMap(([name, value]) => [
    "-H",
    `${name}: ${value}`,
  ])
}

function toFetchError(response: IncludedResponse): FetchError {
  const data = decodeBody(response)
  const error = new FetchError(`HTTP ${String(response.status)} ${response.statusText}`.trim())
  return Object.assign(error, {
    response: { status: response.status, statusText: response.statusText, headers: response.headers },
    data,
    status: response.status,
    statusCode: response.status,
    statusText: response.statusText,
  })
}

async function runGhApi(root: string, path: string, options: RequestOptions): Promise<IncludedResponse> {
  const method = (options.method ?? "GET").toUpperCase()
  if (method !== "GET") {
    throw new GitAdapterError(`The GitHub CLI adapter only reads; it cannot ${method}.`, "unsupported")
  }
  const args = [
    "api",
    "-i",
    ...buildHeaderArgs(options.headers),
    buildRequestPath(path, options.query),
  ]
  try {
    const { stdout } = await execFileAsync("gh", args, {
      cwd: root,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
    })
    const parsed = parseIncludedResponse(stdout)
    if (parsed === null) throw new GitAdapterError("The GitHub CLI answered with something unreadable.")
    return parsed
  } catch (cause) {
    if (cause instanceof GitAdapterError) throw cause
    const stdout = (cause as { stdout?: unknown }).stdout
    const parsed = typeof stdout === "string" ? parseIncludedResponse(stdout) : null
    throw parsed === null ? asGitAdapterError(cause) : toFetchError(parsed)
  }
}

function createGhClient(root: string): HttpClient {
  const request = async (path: string, options: RequestOptions = {}): Promise<RawResult> => {
    const response = await runGhApi(root, path, options)
    if (response.status >= HTTP_ERROR_FLOOR) throw toFetchError(response)
    return {
      _data: decodeBody(response),
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
      ok: true,
    }
  }
  const client = async (path: string, options?: RequestOptions): Promise<unknown> =>
    (await request(path, options))._data
  return Object.assign(client, { raw: request, [CACHE_SCOPE]: `gh-cli#${root}` }) as unknown as HttpClient
}

export type GithubCLIForgeAdapterOptions = { root: string }

export class GithubCLIForgeAdapter extends ExtendedGitHubProvider {
  constructor({ root }: GithubCLIForgeAdapterOptions) {
    super({ token: CLI_MANAGED_TOKEN })
    this["client"] = createGhClient(root)
  }
}
