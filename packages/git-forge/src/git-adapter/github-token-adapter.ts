import { ExtendedGitHubProvider } from "./custom-providers/extended-github-provider"
import { GithubAdapter, githubApiRoot } from "./github-adapter"

export interface GithubTokenAdapterOptions {
  token: string
  repo?: string
  root?: string
  baseUrl?: string
  environment?: Readonly<Record<string, string | undefined>>
  baseBranch?: string | null
}

export class GithubTokenAdapter extends GithubAdapter {
  override readonly id = "github"
  override readonly name = "GitHub"

  protected readonly provider: ExtendedGitHubProvider

  constructor({ token, baseUrl = "", ...options }: GithubTokenAdapterOptions) {
    super(options)
    this.provider = new ExtendedGitHubProvider({ token, baseURL: githubApiRoot(baseUrl) })
  }

  protected override async resolveRepo(): Promise<string> {
    return Promise.resolve(this.repo)
  }
}
