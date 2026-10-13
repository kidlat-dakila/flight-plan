import type { SavedConfiguration } from "./configuration"

export interface ConfigurationStore {
  readonly read: () => Promise<readonly SavedConfiguration[]>
  readonly write: (configurations: readonly SavedConfiguration[]) => Promise<void>
}

export class InMemoryConfigurationStore implements ConfigurationStore {
  private configurations: readonly SavedConfiguration[]

  public constructor(configurations: readonly SavedConfiguration[]) {
    this.configurations = configurations
  }

  public readonly read = async (): Promise<readonly SavedConfiguration[]> => await Promise.resolve(this.configurations)

  public readonly write = async (configurations: readonly SavedConfiguration[]): Promise<void> => {
    this.configurations = configurations
    await Promise.resolve()
  }
}
