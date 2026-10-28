import { GitAdapterError } from "@/git-adapter/types"
import { GithubCLIForgeAdapter } from "./custom-providers/github-cli-forge-adapter"
import { GithubAdapter } from "./github-adapter"
import { readRemote } from "./helpers/remote"

export interface GithubCliAdapterOptions {
  root?: string
  repo?: string
  environment?: Readonly<Record<string, string | undefined>>
  baseBranch?: string | null
}

export class GithubCLIAdapter extends GithubAdapter {
  override readonly id = "gh"
  override readonly name = "the GitHub CLI"

  protected readonly provider: GithubCLIForgeAdapter

  constructor(options: GithubCliAdapterOptions = {}) {
    super(options)
    this.provider = new GithubCLIForgeAdapter({ root: this.root, environment: this.environment })
  }

  protected override async resolveRepo(): Promise<string> {
    if (this.repo !== "") return this.repo
    const remote = await readRemote(this.root)
    if (remote === null) {
      throw new GitAdapterError(
        "This folder has no git remote, so there is no repository to read.",
        "no-repo",
      )
    }
    return remote.fullName
  }
}
