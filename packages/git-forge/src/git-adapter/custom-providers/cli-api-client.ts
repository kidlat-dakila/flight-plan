import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { FetchError } from "@agntn/forges"
import {
  GitAdapterError,
  type GitAdapterProblem,
} from "@/utils/git-adapter/types"

const execFileAsync = promisify(execFile)

const COMMAND_TIMEOUT_MS = 30_000
const BYTES_PER_MEBIBYTE = 1_048_576
const MAX_OUTPUT_MEBIBYTES = 32
const MAX_OUTPUT_BYTES = MAX_OUTPUT_MEBIBYTES * BYTES_PER_MEBIBYTE
const GRAPHQL_PATH_PATTERN = /^\/?graphql$/
const HTTP_ERROR_FLOOR = 400
const CACHE_SCOPE = Symbol.for("forges.cacheScope")
type HeaderSource = ConstructorParameters<typeof Headers>[0]

const AUTH_FAILURE_PATTERN = /auth|not logged in|unauthorized|no token/

const STATUS_LINE = /^HTTP\/\S+\s+(\d{3})\s*(.*)$/

interface RequestOptions {
  query?: Record<string, unknown>
  headers?: HeaderSource
  method?: string
  body?: Record<string, unknown>
  responseType?: "text" | "json"
}

interface IncludedResponse {
  status: number
  statusText: string
  headers: Headers
  body: string
}

interface RawResult {
  _data: unknown
  headers: Headers
  status: number
  statusText: string
  ok: boolean
}

export interface CliApiSettings {
  readonly command: string
  readonly toolName: string
  readonly allowsGraphql: boolean
}

export type CliEnvironment = Readonly<Record<string, string | undefined>> | undefined

function textField(cause: unknown, field: string): string {
  const value: unknown = typeof cause === "object" && cause !== null ? Reflect.get(cause, field) : undefined
  return typeof value === "string" ? value : ""
}

export function asCliError(settings: CliApiSettings, cause: unknown): GitAdapterError {
  if (textField(cause, "code") === "ENOENT") {
    return new GitAdapterError(`${settings.toolName} is not installed here.`, "no-cli")
  }

  const stderr = textField(cause, "stderr").trim()
  const message = stderr === "" ? String(cause) : stderr
  return new GitAdapterError(message, classifyProblem(message))
}

function classifyProblem(message: string): GitAdapterProblem {
  const lower = message.toLowerCase()
  if (AUTH_FAILURE_PATTERN.test(lower)) return "auth"
  if (lower.includes("not a git repository") || lower.includes("no git remotes")) {
    return "no-repo"
  }
  return "unknown"
}

function parseIncludedResponse(stdout: string): IncludedResponse | null {
  const separator = /\r?\n\r?\n/.exec(stdout)
  if (separator === null) return null
  const head = stdout.slice(0, separator.index).split(/\r?\n/)
  const match = STATUS_LINE.exec(head.at(0) ?? "")
  if (match === null) return null
  const headers = new Headers()
  for (const line of head.slice(1)) {
    const colon = line.indexOf(":")
    if (colon > 0) headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim())
  }
  return {
    status: Number(match[1]),
    statusText: match[2],
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
  const params = new URLSearchParams(
    Object.entries(query ?? {}).flatMap(([key, value]): [string, string][] =>
      typeof value === "string" || typeof value === "number" ? [[key, String(value)]] : [],
    ),
  )
  const suffix = params.toString()
  return suffix === "" ? relative : `${relative}${relative.includes("?") ? "&" : "?"}${suffix}`
}

function buildBodyArgs(body: RequestOptions["body"]): string[] {
  return Object.entries(body ?? {}).flatMap(([name, value]) => (typeof value === "string" ? ["-f", `${name}=${value}`] : []))
}

function buildHeaderArgs(headers: HeaderSource): string[] {
  return [...new Headers(headers).entries()].flatMap(([name, value]) => [
    "-H",
    `${name}: ${value}`,
  ])
}

class CliFetchError extends FetchError {
  readonly response: Response
  readonly data: unknown
  readonly status: number
  readonly statusCode: number

  constructor(response: IncludedResponse) {
    super(`HTTP ${String(response.status)} ${response.statusText}`.trim())
    this.response = new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers })
    this.data = decodeBody(response)
    this.status = response.status
    this.statusCode = response.status
  }
}

function toFetchError(response: IncludedResponse): FetchError {
  return new CliFetchError(response)
}

async function runCliApi(
  settings: CliApiSettings,
  root: string,
  path: string,
  options: RequestOptions,
  environment: CliEnvironment,
): Promise<IncludedResponse> {
  const method = (options.method ?? "GET").toUpperCase()
  const isGraphqlQuery = settings.allowsGraphql && method === "POST" && GRAPHQL_PATH_PATTERN.test(toRelativePath(path))
  if (method !== "GET" && !isGraphqlQuery) {
    throw new GitAdapterError(`${settings.toolName} adapter only reads; it cannot ${method}.`, "unsupported")
  }
  const args = [
    "api",
    "-i",
    ...buildHeaderArgs(options.headers),
    ...buildBodyArgs(options.body),
    buildRequestPath(path, options.query),
  ]
  try {
    const { stdout } = await execFileAsync(settings.command, args, {
      cwd: root,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      ...(environment === undefined ? {} : { env: environment }),
    })
    const parsed = parseIncludedResponse(stdout)
    if (parsed === null) throw new GitAdapterError(`${settings.toolName} answered with something unreadable.`)
    return parsed
  } catch (cause) {
    if (cause instanceof GitAdapterError) throw cause
    const stdout = textField(cause, "stdout")
    const parsed = stdout === "" ? null : parseIncludedResponse(stdout)
    throw parsed === null ? asCliError(settings, cause) : toFetchError(parsed)
  }
}

export function createCliApiClient(settings: CliApiSettings, root: string, environment: CliEnvironment): unknown {
  const request = async (path: string, options: RequestOptions = {}): Promise<RawResult> => {
    const response = await runCliApi(settings, root, path, options, environment)
    if (response.status >= HTTP_ERROR_FLOOR) throw toFetchError(response)
    return {
      _data: decodeBody(response),
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
      ok: true,
    }
  }
  const client = async (path: string, options?: RequestOptions): Promise<unknown> => (await request(path, options))._data
  Reflect.defineProperty(client, "raw", { value: request })
  Reflect.defineProperty(client, CACHE_SCOPE, { value: `${settings.command}-cli#${root}` })
  return client
}
