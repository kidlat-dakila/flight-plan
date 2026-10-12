export interface ChangeRevision {
  readonly headCommit: string
  readonly baseCommit: string
}

export interface ChangeReader {
  readonly findRevision: (repositoryPath: string, branchName: string) => Promise<ChangeRevision | null>
  readonly readDiff: (repositoryPath: string, revision: ChangeRevision) => Promise<string | null>
  readonly listChangedPaths: (repositoryPath: string, revision: ChangeRevision) => Promise<readonly string[] | null>
  readonly listPaths: (repositoryPath: string, commit: string) => Promise<readonly string[] | null>
  readonly readFile: (repositoryPath: string, commit: string, path: string) => Promise<string | null>
}

export interface RecordedChange {
  readonly repositoryPath: string
  readonly branchName: string
  readonly revision: ChangeRevision
  readonly diff: string
  readonly changedPaths: readonly string[]
  readonly texts: Readonly<Record<string, string>>
}

export class InMemoryChangeReader implements ChangeReader {
  private readonly changes: readonly RecordedChange[]

  public constructor(changes: readonly RecordedChange[]) {
    this.changes = changes
  }

  public readonly findRevision = async (repositoryPath: string, branchName: string): Promise<ChangeRevision | null> =>
    await Promise.resolve(
      this.changes.find((change) => change.repositoryPath === repositoryPath && change.branchName === branchName)?.revision
      ?? null,
    )

  public readonly readDiff = async (repositoryPath: string, revision: ChangeRevision): Promise<string | null> =>
    await Promise.resolve(this.changeAt(repositoryPath, revision.headCommit)?.diff ?? null)

  public readonly listChangedPaths = async (
    repositoryPath: string,
    revision: ChangeRevision,
  ): Promise<readonly string[] | null> =>
    await Promise.resolve(this.changeAt(repositoryPath, revision.headCommit)?.changedPaths ?? null)

  public readonly listPaths = async (repositoryPath: string, commit: string): Promise<readonly string[] | null> => {
    const change = this.changeAt(repositoryPath, commit)
    return await Promise.resolve(change === null ? null : Object.keys(change.texts))
  }

  public readonly readFile = async (repositoryPath: string, commit: string, path: string): Promise<string | null> => {
    const texts = new Map(Object.entries(this.changeAt(repositoryPath, commit)?.texts ?? {}))
    return await Promise.resolve(texts.get(path) ?? null)
  }

  private readonly changeAt = (repositoryPath: string, headCommit: string): RecordedChange | null =>
    this.changes.find((change) => change.repositoryPath === repositoryPath && change.revision.headCommit === headCommit)
    ?? null
}

export const branchNameOf = (target: { readonly kind: "pull-request", readonly branch: string } | { readonly kind: "branch", readonly name: string }): string =>
  target.kind === "pull-request" ? target.branch : target.name
