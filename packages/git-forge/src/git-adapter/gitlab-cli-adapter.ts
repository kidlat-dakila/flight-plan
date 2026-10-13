import { GitlabCLIForgeAdapter } from "./custom-providers/gitlab-cli-forge-adapter"
import { GitlabAdapter } from "./gitlab-adapter"

const CLI_GRAPHQL_PATH = "graphql"

export interface GitlabCliAdapterOptions {
  root?: string
  repo?: string
  baseUrl?: string
  environment?: Readonly<Record<string, string | undefined>>
}

export class GitlabCLIAdapter extends GitlabAdapter {
  override readonly id = "glab"
  override readonly name = "the GitLab CLI"

  constructor(options: GitlabCliAdapterOptions = {}) {
    super({
      ...options,
      token: "",
      provider: new GitlabCLIForgeAdapter({ root: options.root ?? process.cwd(), environment: options.environment }),
    })
  }

  protected override graphqlPath(): string {
    return CLI_GRAPHQL_PATH
  }
}
