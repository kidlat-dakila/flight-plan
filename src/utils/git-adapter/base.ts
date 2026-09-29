import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { splitDiff } from "./helpers/diff"
import {
  GitAdapterError,
  unsupported,
  type Capability,
  type Comparison,
  type GitAdapterId,
  type LineRange,
  type ListOptions,
  type ReviewFilterOption,
  type ReviewSummary,
  type ReviewTarget,
  type TargetRef,
} from "../../lib/git-adapter/types"

const execFileAsync = promisify(execFile)

const COMMAND_TIMEOUT_MS = 30_000
const REVISION_CHECK_TIMEOUT_MS = 10_000
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024
const FIELD_SEPARATOR = "\x1f"
const BRANCH_LOG_FORMAT = `%s%x1f%an%x1f%aI`
const DEFAULT_BRANCH_GUESSES = ["origin/main", "origin/master", "main", "master"]

type BranchSummary = { title: string; author: string; updatedAt: string }

async function runGit(root: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
    })
    return stdout
  } catch (cause) {
    const code =
      cause instanceof Error && "code" in cause
        ? String((cause as { code?: unknown }).code)
        : ""
    if (code === "ENOENT") {
      throw new GitAdapterError("git is not installed here.", "no-cli")
    }
    const stderr =
      cause instanceof Error && "stderr" in cause
        ? String((cause as { stderr?: unknown }).stderr).trim()
        : ""
    throw new GitAdapterError(stderr === "" ? String(cause) : stderr, "unknown")
  }
}

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

async function resolveBranch(root: string, name: string): Promise<string | null> {
  for (const candidate of [name, `origin/${name}`, `refs/remotes/origin/${name}`]) {
    if (await revisionExists(root, candidate)) {
      return (await runGit(root, ["rev-parse", candidate])).trim()
    }
  }
  return null
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
    (await readRemoteHead(root)) ??
    (await findFirstExistingRevision(root, DEFAULT_BRANCH_GUESSES))
  )
}

async function findFirstExistingRevision(
  root: string,
  candidates: readonly string[],
): Promise<string | null> {
  for (const candidate of candidates) {
    if (await revisionExists(root, candidate)) return candidate
  }
  return null
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
  const [title, author, updatedAt] = line.split(FIELD_SEPARATOR)
  return {
    title: title === undefined || title === "" ? branchName : title,
    author: author ?? "unknown",
    updatedAt: updatedAt ?? "",
  }
}

function branchNameOf(ref: TargetRef): string {
  if (ref.kind !== "branch") {
    throw unsupported("git", "read a pull request; it only knows branches")
  }
  return ref.name
}

function missingBranchError(name: string): GitAdapterError {
  return new GitAdapterError(
    `${name} is not in this checkout. Fetch it and try again.`,
    "no-repo",
  )
}

export type BaseGitAdapterOptions = { root?: string; repo?: string }

export class BaseGitAdapter {
  readonly id: GitAdapterId = "git"
  readonly name: string = "git"
  readonly repo: string
  readonly capabilities: ReadonlySet<Capability> = new Set<Capability>([
    "blob",
    "compare",
    "headSha",
    "diff",
  ])

  protected readonly root: string

  constructor({ root = process.cwd(), repo = "" }: BaseGitAdapterOptions = {}) {
    this.root = root
    this.repo = repo
  }

  supports(capability: Capability): boolean {
    return this.capabilities.has(capability)
  }

  reviewFilters(): readonly ReviewFilterOption[] {
    return []
  }

  async listTargets(options: ListOptions): Promise<ReviewTarget[]> {
    const refs = options.pinned ?? []
    const found = await Promise.all(refs.map((ref) => this.target(ref)))
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
    if (base === null) {
      throw new GitAdapterError(
        "This checkout has no main branch to compare against.",
        "no-repo",
      )
    }
    return runGit(this.root, ["diff", `${base}...${head}`])
  }

  async compare(base: string, head: string): Promise<Comparison> {
    const [baseExists, headExists] = await Promise.all([
      revisionExists(this.root, base),
      revisionExists(this.root, head),
    ])
    if (!baseExists || !headExists) {
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

  async blob(path: string, sha: string): Promise<string> {
    try {
      return await runGit(this.root, ["show", `${sha}:${path}`])
    } catch {
      throw new GitAdapterError(
        `${path} is not in this checkout at ${sha.slice(0, 8)}. The commit may ` +
          `not be fetched, or the file was renamed.`,
        "no-repo",
      )
    }
  }

  listLabels(): Promise<string[]> {
    return this.refuse("list labels: they belong to a code host")
  }

  reviewers(_ref: TargetRef): Promise<ReviewSummary> {
    return this.refuse("say who is reviewing: a branch has no reviewers, only commits")
  }

  permalink(_ref: TargetRef, _path: string, _range?: LineRange): string {
    return this.refuse("link to a diff: there is no web interface")
  }

  protected refuse(action: string): never {
    throw unsupported(this.name, action)
  }
}
