import { asCliError, createCliApiClient, type CliApiSettings, type CliEnvironment } from "./cli-api-client"
import { ExtendedGitHubProvider } from "./extended-github-provider"

const CLI_MANAGED_TOKEN = "credentials-held-by-the-github-cli"

const GITHUB_CLI: CliApiSettings = { command: "gh", toolName: "The GitHub CLI", allowsGraphql: true }

export const asGitAdapterError = (cause: unknown): ReturnType<typeof asCliError> => asCliError(GITHUB_CLI, cause)

export interface GithubCLIForgeAdapterOptions {
  root: string
  environment?: CliEnvironment
}

export class GithubCLIForgeAdapter extends ExtendedGitHubProvider {
  constructor({ root, environment }: GithubCLIForgeAdapterOptions) {
    super({ token: CLI_MANAGED_TOKEN })
    Reflect.set(this, "client", createCliApiClient(GITHUB_CLI, root, environment))
  }
}
