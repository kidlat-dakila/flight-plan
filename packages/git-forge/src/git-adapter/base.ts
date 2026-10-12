import { execFile } from "node:child_process"
import { promisify } from "node:util"
import {
  GitAdapterError,
  unsupported,
  type BranchScope,
  type BranchTip,
  type Capability,
  type Comparison,
  type FileSearch,
  type GitAdapterId,
  type HistoryOptions,
  type LineRange,
  type ListOptions,
  type Person,
  type PullRequestHistory,
  type ReviewFilterOption,
  type ReviewSummary,
  type ReviewTarget,
  type TargetRef,
} from "@/git-adapter/types"
import { splitDiff } from "./helpers/diff"

const execFileAsync = promisify(execFile)

const COMMAND_TIMEOUT_MS = 30_000
const FETCH_TIMEOUT_MS = 60_000
const REVISION_CHECK_TIMEOUT_MS = 10_000
const BYTES_PER_MEBIBYTE = 1_048_576
const MAX_OUTPUT_MEBIBYTES = 32
const MAX_OUTPUT_BYTES = MAX_OUTPUT_MEBIBYTES * BYTES_PER_MEBIBYTE
const SHORT_SHA_LENGTH = 8
const FIELD_SEPARATOR = "\x1f"
const BRANCH_LOG_FORMAT = `%s%x1f%an%x1f%aI`
const BRANCH_REF_FORMAT = ["%(refname)", "%(objectname)", "%(authoremail)", "%(committerdate:iso-strict)"].join("%1f")
const BRANCH_DATE_FORMAT = "%aI"
const DEFAULT_BRANCH_GUESSES = ["origin/main", "origin/master", "main", "master"]
const HEADS_PREFIX = "refs/heads/"
const REMOTES_PREFIX = "refs/remotes/"
const HEADS_NAMESPACE = "refs/heads"
const REMOTES_NAMESPACE = "refs/remotes"
const REF_NAMESPACES: Readonly<Record<BranchScope, readonly string[]>> = {
  everywhere: [HEADS_NAMESPACE, REMOTES_NAMESPACE],
  checkout: [HEADS_NAMESPACE],
}
const REMOTE_HEAD_NAME = "HEAD"
const REMOTE_PREFIX_PATTERN = /^[^/]+\//
const EMAIL_BRACKETS_PATTERN = /^<|>$/g
const LINE_BREAK_PATTERN = /\r?\n/
const NUL = "\0"
const LINE_FEED = "\n"
const LINE_FEED_BYTE = 0x0a
const MAX_BATCH_OUTPUT_MEBIBYTES = 512
const MAX_BATCH_OUTPUT_BYTES = MAX_BATCH_OUTPUT_MEBIBYTES * BYTES_PER_MEBIBYTE
const BLOBS_PER_BATCH = 500
const PATTERNS_PER_SEARCH = 400
const OBJECT_HEADER_PATTERN = /^[0-9a-f]+ ([a-z]+) (\d+)$/
const BLOB_TYPE = "blob"
const NO_MATCH_EXIT_CODE = 1

interface BranchSummary { title: string, author: string, updatedAt: string }

interface BranchRef extends BranchTip { isRemote: boolean }

interface GitOptions {
  timeout?: number
  emptyExitCode?: number
  environment?: Readonly<Record<string, string | undefined>>
}

const exitCodeOf = (cause: unknown): string => (cause instanceof Error && "code" in cause ? String(cause.code) : "")

const stderrOf = (cause: unknown): string => (cause instanceof Error && "stderr" in cause ? String(cause.stderr).trim() : "")

function gitFailure(cause: unknown): GitAdapterError {
  if (exitCodeOf(cause) === "ENOENT") return new GitAdapterError("git is not installed here.", "no-cli")
  const stderr = stderrOf(cause)
  return new GitAdapterError(stderr === "" ? String(cause) : stderr, "unknown")
}

const subprocessEnvironment = (options: GitOptions): { env?: NodeJS.ProcessEnv } =>
  options.environment === undefined ? {} : { env: { ...options.environment, GIT_TERMINAL_PROMPT: "0" } }

async function runGit(root: string, args: string[], options: GitOptions = {}): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      timeout: options.timeout ?? COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      ...subprocessEnvironment(options),
    })
    return stdout
  } catch (cause) {
    const isEmptyResult = options.emptyExitCode !== undefined && exitCodeOf(cause) === String(options.emptyExitCode)
    if (isEmptyResult && stderrOf(cause) === "") return ""
    throw gitFailure(cause)
  }
}

async function runGitWithInput(root: string, args: string[], input: string, options: GitOptions = {}): Promise<Buffer> {
  try {
    const running = execFileAsync("git", args, {
      cwd: root,
      timeout: options.timeout ?? COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_BATCH_OUTPUT_BYTES,
      encoding: "buffer",
      ...subprocessEnvironment(options),
    })
    running.child.stdin?.end(input)
    const { stdout } = await running
    return stdout
  } catch (cause) {
    throw gitFailure(cause)
  }
}

interface BatchReading {
  readonly offset: number
  readonly texts: ReadonlyMap<string, string>
}

function readBatchEntry(output: Buffer, { offset, texts }: BatchReading, path: string): BatchReading {
  const headerEnd = output.indexOf(LINE_FEED_BYTE, offset)
  if (headerEnd === -1) return { offset: output.length, texts }
  const header = OBJECT_HEADER_PATTERN.exec(output.toString("utf8", offset, headerEnd))
  const contentStart = headerEnd + 1
  if (header === null) return { offset: contentStart, texts }
  const contentEnd = contentStart + Number(header[2])
  const next = contentEnd + 1
  if (header[1] !== BLOB_TYPE) return { offset: next, texts }
  return { offset: next, texts: new Map(texts).set(path, output.toString("utf8", contentStart, contentEnd)) }
}

export function parseBlobBatch(output: Buffer, paths: readonly string[]): Map<string, string> {
  const reading = paths.reduce<BatchReading>((held, path) => readBatchEntry(output, held, path), { offset: 0, texts: new Map() })
  return new Map(reading.texts)
}

const chunksOf = <Item>(items: readonly Item[], size: number): Item[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_unused, index) => items.slice(index * size, (index + 1) * size))

async function revisionExists(root: string, revision: string): Promise<boolean> {
  try {
    await execFileAsync(
      "git",
      ["rev-parse", "--verify", "--quiet", `${revision}^{commit}`],
      { cwd: root, timeout: REVISION_CHECK_TIMEOUT_MS },
    )
    return true
  } catch {
    return false
  }
}

async function findFirstExistingRevision(
  root: string,
  candidates: readonly string[],
): Promise<string | null> {
  const exists = await Promise.all(candidates.map(async (candidate) => await revisionExists(root, candidate)))
  return candidates.find((_candidate, position) => exists[position]) ?? null
}

async function resolveBranch(root: string, name: string): Promise<string | null> {
  const revision = await findFirstExistingRevision(root, [name, `origin/${name}`, `refs/remotes/origin/${name}`])
  return revision === null ? null : (await runGit(root, ["rev-parse", revision])).trim()
}

async function readRemoteHead(root: string): Promise<string | null> {
  try {
    const head = await runGit(root, [
      "symbolic-ref",
      "--quiet",
      "refs/remotes/origin/HEAD",
    ])
    const name = head.trim().replace(/^refs\/remotes\//, "")
    return name === "" ? null : name
  } catch {
    return null
  }
}

async function findDefaultBranch(root: string): Promise<string | null> {
  return (
    (await readRemoteHead(root))
    ?? (await findFirstExistingRevision(root, DEFAULT_BRANCH_GUESSES))
  )
}

async function summarizeBranch(
  root: string,
  name: string,
): Promise<BranchSummary | null> {
  const revision = await resolveBranch(root, name)
  if (revision === null) return null
  const line = (
    await runGit(root, ["log", "-1", `--format=${BRANCH_LOG_FORMAT}`, revision])
  ).trim()
  return parseBranchSummary(line, name)
}

function parseBranchSummary(line: string, branchName: string): BranchSummary {
  const [title = "", author = "unknown", updatedAt = ""] = line.split(FIELD_SEPARATOR)
  return { title: title === "" ? branchName : title, author, updatedAt }
}

function toBranchName(refName: string): { name: string, isRemote: boolean } | null {
  if (refName.startsWith(HEADS_PREFIX)) return { name: refName.slice(HEADS_PREFIX.length), isRemote: false }
  if (!refName.startsWith(REMOTES_PREFIX)) return null
  const remoteAndName = refName.slice(REMOTES_PREFIX.length)
  const name = remoteAndName.replace(REMOTE_PREFIX_PATTERN, "")
  return name === REMOTE_HEAD_NAME || name === remoteAndName ? null : { name, isRemote: true }
}

function toBranchRef(line: string): BranchRef | null {
  const [refName = "", sha = "", email = "", date = ""] = line.split(FIELD_SEPARATOR)
  const branch = toBranchName(refName)
  if (branch === null || sha === "" || Number.isNaN(new Date(date).getTime())) return null
  return {
    ...branch,
    sha,
    authorEmail: email.trim().replace(EMAIL_BRACKETS_PATTERN, "").toLowerCase(),
    updatedAt: new Date(date).toISOString(),
  }
}

function newestFirstWithLocalFirst(first: BranchRef, second: BranchRef): number {
  return Date.parse(second.updatedAt) - Date.parse(first.updatedAt) || Number(first.isRemote) - Number(second.isRemote)
}

function toBranchTip({ name, sha, authorEmail, updatedAt }: BranchRef): BranchTip {
  return { name, sha, authorEmail, updatedAt }
}

export function parseBranchTips(output: string, defaultBranchName: string | null): BranchTip[] {
  return output
    .split(LINE_BREAK_PATTERN)
    .map(toBranchRef)
    .filter((ref): ref is BranchRef => ref !== null && ref.name !== defaultBranchName)
    .sort(newestFirstWithLocalFirst)
    .filter((ref, position, refs) => refs.findIndex((other) => other.name === ref.name) === position)
    .map(toBranchTip)
}

export function oldestDate(commitDates: string): string | null {
  const oldest = commitDates.split(LINE_BREAK_PATTERN).filter((line) => line.trim() !== "").pop()
  const date = new Date(oldest ?? "")
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function branchNameOf(ref: TargetRef): string {
  if (ref.kind !== "branch") {
    throw unsupported("git", "read a pull request; it only knows branches")
  }
  return ref.name
}

function missingDefaultBranchError(): GitAdapterError {
  return new GitAdapterError(
    "This checkout has no main branch to compare against.",
    "no-repo",
  )
}

async function findMergeBase(root: string, base: string, head: string): Promise<string | null> {
  try {
    const mergeBase = (await runGit(root, ["merge-base", base, head])).trim()
    return mergeBase === "" ? null : mergeBase
  } catch {
    return null
  }
}

function missingBranchError(name: string): GitAdapterError {
  return new GitAdapterError(
    `${name} is not in this checkout. Fetch it and try again.`,
    "no-repo",
  )
}

const REVISION_SEPARATOR = ":"

const splitNulSeparated = (output: string): string[] => output.split(NUL).filter((entry) => entry !== "")

const extensionPathspec = (extension: string): string => `:(top,glob)**/*${extension}`

export interface BaseGitAdapterOptions {
  root?: string
  repo?: string
  environment?: Readonly<Record<string, string | undefined>>
}

export class BaseGitAdapter {
  readonly id: GitAdapterId = "git"
  readonly name: string = "git"
  readonly repo: string
  readonly capabilities: ReadonlySet<Capability> = new Set<Capability>([
    "blob",
    "compare",
    "headSha",
    "diff",
    "branches",
    "files",
    "search",
  ])

  protected readonly root: string
  protected readonly environment: BaseGitAdapterOptions["environment"]

  constructor({ root = process.cwd(), repo = "", environment }: BaseGitAdapterOptions = {}) {
    this.root = root
    this.repo = repo
    this.environment = environment
  }

  supports(capability: Capability): boolean {
    return this.capabilities.has(capability)
  }

  reviewFilters(): readonly ReviewFilterOption[] {
    return []
  }

  async listTargets(options: ListOptions): Promise<ReviewTarget[]> {
    const refs = options.pinned ?? []
    const found = await Promise.all(refs.map(async (ref) => await this.target(ref)))
    return found.filter((row): row is ReviewTarget => row !== null)
  }

  async target(ref: TargetRef): Promise<ReviewTarget | null> {
    const summary = await summarizeBranch(this.root, branchNameOf(ref))
    if (summary === null) return null
    return { ref, ...summary, url: "", isDraft: false, reason: "added" }
  }

  async headSha(ref: TargetRef): Promise<string> {
    const name = branchNameOf(ref)
    const sha = await resolveBranch(this.root, name)
    if (sha === null) throw missingBranchError(name)
    return sha
  }

  async diff(ref: TargetRef): Promise<string> {
    const name = branchNameOf(ref)
    const head = await resolveBranch(this.root, name)
    if (head === null) throw missingBranchError(name)
    const base = await findDefaultBranch(this.root)
    if (base === null) throw missingDefaultBranchError()
    return await runGit(this.root, ["diff", `${base}...${head}`])
  }

  async baseSha(ref: TargetRef): Promise<string> {
    const [target, head] = await Promise.all([this.target(ref), this.headSha(ref)])
    const base = target?.baseSha ?? (await findDefaultBranch(this.root))
    if (base === null) throw missingDefaultBranchError()
    return (await findMergeBase(this.root, base, head)) ?? base
  }

  async compare(base: string, head: string): Promise<Comparison> {
    const [isBaseKnown, isHeadKnown] = await Promise.all([
      revisionExists(this.root, base),
      revisionExists(this.root, head),
    ])
    if (!isBaseKnown || !isHeadKnown) {
      throw new GitAdapterError(
        "One of those commits is not in this checkout. Fetch and try again.",
        "no-repo",
      )
    }
    const [diff, count] = await Promise.all([
      runGit(this.root, ["diff", `${base}...${head}`]),
      runGit(this.root, ["rev-list", "--count", `${base}..${head}`]),
    ])
    return { files: splitDiff(diff), commits: Number(count.trim()) || 0 }
  }

  protected async diffBetween(base: string, head: string): Promise<string> {
    const [isBaseKnown, isHeadKnown] = await Promise.all([
      revisionExists(this.root, base),
      revisionExists(this.root, head),
    ])
    if (!isBaseKnown || !isHeadKnown) {
      throw new GitAdapterError(
        "One of those commits is not in this checkout. Fetch and try again.",
        "no-repo",
      )
    }
    return await runGit(this.root, ["diff", `${base}...${head}`])
  }

  async blob(path: string, sha: string): Promise<string> {
    try {
      return await runGit(this.root, ["show", `${sha}:${path}`])
    } catch {
      throw new GitAdapterError(
        `${path} is not in this checkout at ${sha.slice(0, SHORT_SHA_LENGTH)}. The commit may `
        + `not be fetched, or the file was renamed.`,
        "no-repo",
      )
    }
  }

  async blobs(paths: readonly string[], sha: string): Promise<Map<string, string>> {
    const readable = [...new Set(paths)].filter((path) => !path.includes(LINE_FEED))
    const batches = await Promise.all(
      chunksOf(readable, BLOBS_PER_BATCH).map(async (batch) => {
        const input = batch.map((path) => `${sha}:${path}${LINE_FEED}`).join("")
        return parseBlobBatch(await runGitWithInput(this.root, ["cat-file", "--batch"], input), batch)
      }),
    )
    return new Map(batches.flatMap((batch) => [...batch]))
  }

  async listFiles(sha: string): Promise<string[]> {
    const output = await runGit(this.root, ["ls-tree", "-r", "-z", "--name-only", "--full-tree", sha])
    return splitNulSeparated(output)
  }

  async searchFiles(sha: string, { patterns, extensions }: FileSearch): Promise<string[]> {
    if (patterns.length === 0 || extensions.length === 0) return []
    const found = await Promise.all(
      chunksOf([...new Set(patterns)], PATTERNS_PER_SEARCH).map(async (chunk) => await this.searchFilesFor(sha, chunk, extensions)),
    )
    return [...new Set(found.flat())]
  }

  private async searchFilesFor(sha: string, patterns: readonly string[], extensions: readonly string[]): Promise<string[]> {
    const output = await runGit(
      this.root,
      [
        "grep",
        "--files-with-matches",
        "-z",
        "-I",
        "--extended-regexp",
        "--full-name",
        ...patterns.flatMap((pattern) => ["-e", pattern]),
        sha,
        "--",
        ...extensions.map(extensionPathspec),
      ],
      { emptyExitCode: NO_MATCH_EXIT_CODE },
    )
    return splitNulSeparated(output).map((found) => found.slice(sha.length + REVISION_SEPARATOR.length))
  }

  async listBranches(scope: BranchScope = "everywhere"): Promise<BranchTip[]> {
    const base = await findDefaultBranch(this.root)
    const unmergedFilter = base === null ? [] : [`--no-merged=${base}`]
    const output = await runGit(this.root, [
      "for-each-ref",
      ...unmergedFilter,
      `--format=${BRANCH_REF_FORMAT}`,
      ...REF_NAMESPACES[scope],
    ])
    return parseBranchTips(output, base?.replace(REMOTE_PREFIX_PATTERN, "") ?? null)
  }

  async branchStart(name: string): Promise<string | null> {
    const [base, head] = await Promise.all([findDefaultBranch(this.root), resolveBranch(this.root, name)])
    if (base === null || head === null) return null
    const dates = await runGit(this.root, ["log", `--format=${BRANCH_DATE_FORMAT}`, `${base}..${head}`])
    return oldestDate(dates)
  }

  async fetchRemotes(): Promise<void> {
    await runGit(this.root, ["fetch", "--all", "--prune", "--quiet"], {
      timeout: FETCH_TIMEOUT_MS,
      environment: this.environment,
    })
  }

  async listLabels(): Promise<string[]> {
    return await this.refuseAsync("list labels: they belong to a code host")
  }

  async reviewers(ref: TargetRef): Promise<ReviewSummary>
  async reviewers(): Promise<ReviewSummary> {
    return await this.refuseAsync("say who is reviewing: a branch has no reviewers, only commits")
  }

  async viewer(): Promise<Person> {
    return await this.refuseAsync("say who is signed in: there is no account behind a checkout")
  }

  async searchPeople(query: string): Promise<Person[]>
  async searchPeople(): Promise<Person[]> {
    return await this.refuseAsync("search people: there is no account behind a checkout")
  }

  async listPullRequests(options: HistoryOptions): Promise<PullRequestHistory[]>
  async listPullRequests(): Promise<PullRequestHistory[]> {
    return await this.refuseAsync("list pull requests: they belong to a code host")
  }

  permalink(ref: TargetRef, path: string, range?: LineRange): string
  permalink(): string {
    return this.refuse("link to a diff: there is no web interface")
  }

  protected refuse(action: string): never {
    throw unsupported(this.name, action)
  }

  protected async refuseAsync(action: string): Promise<never> {
    return await Promise.reject(unsupported(this.name, action))
  }
}
