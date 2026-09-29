import { GithubCLIForgeAdapter } from "./custom-providers/github-cli-forge-adapter"
import { readRemote } from "./helpers/remote"
import { GitAdapterError } from "../../lib/git-adapter/types"
import { GithubAdapter } from "./github-adapter"

export type GithubCliAdapterOptions = { root?: string; repo?: string }

export class GithubCLIAdapter extends GithubAdapter {
  override readonly id = "gh"
  override readonly name = "the GitHub CLI"

  protected readonly provider: GithubCLIForgeAdapter

  constructor(options: GithubCliAdapterOptions = {}) {
    super(options)
    this.provider = new GithubCLIForgeAdapter({ root: this.root })
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
