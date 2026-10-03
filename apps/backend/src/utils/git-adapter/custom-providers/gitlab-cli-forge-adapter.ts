import { createCliApiClient, type CliApiSettings, type CliEnvironment } from "./cli-api-client"
import { ExtendedGitLabProvider } from "./extended-gitlab-provider"

const CLI_MANAGED_TOKEN = "credentials-held-by-the-gitlab-cli"

const GITLAB_CLI: CliApiSettings = { command: "glab", toolName: "The GitLab CLI", allowsGraphql: false }

export interface GitlabCLIForgeAdapterOptions {
  root: string
  environment?: CliEnvironment
}

export class GitlabCLIForgeAdapter extends ExtendedGitLabProvider {
  constructor({ root, environment }: GitlabCLIForgeAdapterOptions) {
    super({ token: CLI_MANAGED_TOKEN })
    Reflect.set(this, "client", createCliApiClient(GITLAB_CLI, root, environment))
  }
}
