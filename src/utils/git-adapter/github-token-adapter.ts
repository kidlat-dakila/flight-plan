import { ExtendedGitHubProvider } from "./custom-providers/extended-github-provider"
import { GithubAdapter, githubApiRoot } from "./github-adapter"

export type GithubTokenAdapterOptions = {
  token: string
  repo?: string
  root?: string
  baseUrl?: string
}

export class GithubTokenAdapter extends GithubAdapter {
  override readonly id = "github"
  override readonly name = "GitHub"

  protected readonly provider: ExtendedGitHubProvider

  constructor({ token, baseUrl = "", ...options }: GithubTokenAdapterOptions) {
    super(options)
    this.provider = new ExtendedGitHubProvider({ token, baseURL: githubApiRoot(baseUrl) })
  }

  protected override resolveRepo(): Promise<string> {
    return Promise.resolve(this.repo)
  }
}
