import { join } from "node:path"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import type { SetupStore } from "@/procedures/get-setup/utils/setup-store"
import { formatSettings, parseSettings } from "@/procedures/get-setup/utils/stored-settings"
import { readTextOrNull, writeText } from "@/utils/text-file"

const SETTINGS_PATH = ["configurations", "settings.json"] as const
const UNREADABLE_MESSAGE = "The saved settings cannot be read."

export class FileSetupStore implements SetupStore {
  private readonly settingsPath: string

  public constructor(dataPath: string) {
    this.settingsPath = join(dataPath, ...SETTINGS_PATH)
  }

  public readonly read = async (): Promise<Setup> => {
    const setup = parseSettings(await readTextOrNull(this.settingsPath))
    if (setup === null) throw new Error(UNREADABLE_MESSAGE)
    return setup
  }

  public readonly write = async (setup: Setup): Promise<void> => {
    await writeText(this.settingsPath, formatSettings(setup))
  }
}
