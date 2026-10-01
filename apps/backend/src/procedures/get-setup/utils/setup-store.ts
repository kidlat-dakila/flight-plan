import type { Setup } from "./setup"

export interface SetupStore {
  readonly read: () => Promise<Setup>
  readonly write: (setup: Setup) => Promise<void>
}

export class InMemorySetupStore implements SetupStore {
  private setup: Setup

  public constructor(setup: Setup) {
    this.setup = setup
  }

  public readonly read = async (): Promise<Setup> => await Promise.resolve(this.setup)

  public readonly write = async (setup: Setup): Promise<void> => {
    this.setup = setup
    await Promise.resolve()
  }
}
