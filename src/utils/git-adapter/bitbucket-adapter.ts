import {
  BITBUCKET_API_ROOT,
  BitbucketForgeAdapter,
  type RawAccount,
  type RawPullRequest,
} from "./custom-providers/bitbucket-forge-adapter"
import {
  orThrowGitAdapterError,
  readFileAt,
  readHeadSha,
  toGitAdapterError,
} from "./forges-provider"
import { splitDiff } from "./helpers/diff"
import { createRest } from "./helpers/rest"
import { mergeTargets, pullRequestItemToTarget } from "./merge-targets"
import { BaseGitAdapter } from "./base"
import {
  GitAdapterError,
  mergeReviewers,
  type Capability,
  type Comparison,
  type Fetcher,
  type LineRange,
  type ListOptions,
  type Reviewer,
  type ReviewSummary,
  type ReviewTarget,
  type TargetRef,
} from "../../lib/git-adapter/types"

const DEFAULT_LIST_LIMIT = 30
const MAX_PAGE_SIZE = 50
const CLOUD_HOST = /(^|\/\/)(api\.)?bitbucket\.org($|\/)/i
const DATA_CENTER_MESSAGE =
  "That is a Bitbucket Data Center or Server instance, which uses a " +
  "different API from Bitbucket Cloud. Flight Plan does not read it yet."

export function bitbucketAnchor(path: string, line?: number): string {
  return line === undefined ? `#L${path}` : `#L${path}T${String(line)}`
}

function isCloudUrl(baseUrl: string): boolean {
  const configured = baseUrl.trim().replace(/\/+$/, "")
  return configured === "" || CLOUD_HOST.test(configured)
}

function splitWorkspace(repo: string): { workspace: string; slug: string } {
  const at = repo.indexOf("/")
  return at === -1
    ? { workspace: repo, slug: "" }
    : { workspace: repo.slice(0, at), slug: repo.slice(at + 1) }
}

function handleOf(user: RawAccount | undefined): string {
  return user?.nickname ?? user?.display_name ?? ""
}

function avatarOf(user: RawAccount | undefined): string {
  return user?.links?.avatar?.href ?? ""
}

function bitbucketReviewState(raw: string): Reviewer["state"] {
  switch (raw.trim().toLowerCase()) {
    case "approved":
      return "approved"
    case "changes_requested":
      return "changes-requested"
    default:
      return "pending"
  }
}

function toTarget(raw: RawPullRequest, reason: ReviewTarget["reason"]): ReviewTarget {
  const destination = raw.destination
  return {
    ref: { kind: "pr", number: raw.id },
    title: raw.title ?? "",
    author: handleOf(raw.author) || "unknown",
    url: raw.links?.html?.href ?? "",
    updatedAt: raw.updated_on ?? "",
    isDraft: raw.draft ?? false,
    ...(destination?.branch?.name === undefined ? {} : { baseRef: destination.branch.name }),
    ...(destination?.commit?.hash === undefined ? {} : { baseSha: destination.commit.hash }),
    reason,
  }
}

function toReviewSummary(raw: RawPullRequest): ReviewSummary {
  const found: Reviewer[] = (raw.participants ?? [])
    .filter((participant) => {
      const acted = (participant.state ?? "") !== ""
      return acted || (participant.role ?? "").toUpperCase() === "REVIEWER"
    })
    .map((participant) => ({
      login: handleOf(participant.user),
      name: participant.user?.display_name,
      avatarUrl: avatarOf(participant.user),
      state: bitbucketReviewState(participant.state ?? ""),
    }))
  return {
    author: {
      login: handleOf(raw.author) || "unknown",
      name: raw.author?.display_name,
      avatarUrl: avatarOf(raw.author),
    },
    reviewers: mergeReviewers(found),
  }
}

function pullRequestId(ref: TargetRef): number {
  if (ref.kind !== "pr") {
    throw new GitAdapterError(
      "Bitbucket reads pull requests, and this row is a branch.",
      "unsupported",
    )
  }
  return ref.number
}

function describeMissingBlob(
  path: string,
  repo: string,
  sha: string,
  error: GitAdapterError,
): string {
  const shortSha = sha.slice(0, 8)
  return error.problem === "no-repo"
    ? `${path} is not in ${repo} at ${shortSha}. The walkthrough ` +
        `may have been written against a different commit, or the file ` +
        `was renamed.`
    : `${path} could not be read from ${repo} at ${shortSha}: ${error.message}`
}

export type BitbucketAdapterOptions = {
  username: string
  token: string
  repo?: string
  root?: string
  baseUrl?: string
  fetcher?: Fetcher
}

export class BitbucketAdapter extends BaseGitAdapter {
  override readonly id = "bitbucket"
  override readonly name = "Bitbucket"
  override readonly capabilities: ReadonlySet<Capability>

  private readonly isCloud: boolean
  private readonly workspace: string
  private readonly slug: string
  private readonly provider: BitbucketForgeAdapter

  constructor({
    username,
    token,
    baseUrl = "",
    fetcher,
    ...options
  }: BitbucketAdapterOptions) {
    super(options)
    this.isCloud = isCloudUrl(baseUrl)
    this.capabilities = this.isCloud
      ? new Set<Capability>(["list", "diff", "compare", "blob", "headSha", "permalink", "reviewers"])
      : new Set<Capability>()
    const { workspace, slug } = splitWorkspace(this.repo)
    this.workspace = workspace
    this.slug = slug
    const authorization = `Basic ${Buffer.from(`${username}:${token}`, "utf8").toString("base64")}`
    this.provider = new BitbucketForgeAdapter({
      rest: createRest({
        baseUrl: BITBUCKET_API_ROOT,
        name: "Bitbucket",
        headers: { authorization, accept: "application/json" },
        fetcher,
      }),
    })
  }

  override async listTargets(options: ListOptions): Promise<ReviewTarget[]> {
    this.assertCloud()
    const limit = Math.min(options.limit ?? DEFAULT_LIST_LIMIT, MAX_PAGE_SIZE)

    const pinned = Promise.all(
      (options.pinned ?? [])
        .filter((ref) => ref.kind === "pr")
        .map((ref) => this.target(ref).catch(() => null)),
    )

    const page = await orThrowGitAdapterError(
      this.provider.pullRequests.list(this.workspace, this.slug, {
        state: "open",
        perPage: limit,
      }),
    )
    const rows = page.items.map((item) => pullRequestItemToTarget(item, "review-requested"))
    const pinnedTargets = (await pinned).filter((row): row is ReviewTarget => row !== null)
    return mergeTargets([rows], pinnedTargets)
  }

  override async target(ref: TargetRef): Promise<ReviewTarget | null> {
    this.assertCloud()
    if (ref.kind === "branch") return super.target(ref)
    const raw = await this.pullRequest(pullRequestId(ref))
    if ((raw.state ?? "").toUpperCase() !== "OPEN") return null
    return toTarget(raw, "pinned")
  }

  override async reviewers(ref: TargetRef): Promise<ReviewSummary> {
    this.assertCloud()
    return toReviewSummary(await this.pullRequest(pullRequestId(ref)))
  }

  override async headSha(ref: TargetRef): Promise<string> {
    this.assertCloud()
    if (ref.kind === "branch") return super.headSha(ref)
    const id = pullRequestId(ref)
    const hash = await orThrowGitAdapterError(readHeadSha(this.provider, this.repo, id))
    if (hash === "") {
      throw new GitAdapterError(`Could not find the head commit of #${String(id)}.`)
    }
    return hash
  }

  override async diff(ref: TargetRef): Promise<string> {
    this.assertCloud()
    if (ref.kind === "branch") return super.diff(ref)
    return this.provider.readPullRequestDiff(this.workspace, this.slug, pullRequestId(ref))
  }

  override async compare(base: string, head: string): Promise<Comparison> {
    this.assertCloud()
    try {
      return await super.compare(base, head)
    } catch (cause) {
      if (!(cause instanceof GitAdapterError) || cause.problem !== "no-repo") throw cause
    }
    const [diff, commits] = await Promise.all([
      this.provider.readCompareDiff(this.workspace, this.slug, base, head),
      this.countCommits(base, head),
    ])
    return { files: splitDiff(diff), commits }
  }

  override async blob(path: string, sha: string): Promise<string> {
    this.assertCloud()
    try {
      return await super.blob(path, sha)
    } catch (cause) {
      if (!(cause instanceof GitAdapterError) || cause.problem !== "no-repo") throw cause
    }
    try {
      return await readFileAt(this.provider, this.repo, path, sha)
    } catch (cause) {
      const error = toGitAdapterError(cause)
      throw new GitAdapterError(
        describeMissingBlob(path, this.repo, sha, error),
        error.problem,
      )
    }
  }

  override permalink(ref: TargetRef, path: string, range?: LineRange): string {
    return (
      `https://bitbucket.org/${this.repo}/pull-requests/${String(pullRequestId(ref))}/diff` +
      bitbucketAnchor(path, range?.from)
    )
  }

  private assertCloud(): void {
    if (!this.isCloud) throw new GitAdapterError(DATA_CENTER_MESSAGE, "unsupported")
  }

  private pullRequest(id: number): Promise<RawPullRequest> {
    return this.provider.readPullRequest(this.workspace, this.slug, id)
  }

  private async countCommits(base: string, head: string): Promise<number> {
    try {
      const comparison = await this.provider.commits.compare(
        this.workspace,
        this.slug,
        base,
        head,
      )
      return comparison.totalCount
    } catch {
      return 0
    }
  }
}
