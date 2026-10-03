import { join } from "node:path"
import {
  formatTargetMemory,
  parseTargetMemory,
  startTargetMemory,
  withDismissedTarget,
  type TargetMemory,
} from "@/procedures/list-repositories/utils/target-memory"
import { readTextOrNull, writeText } from "@/utils/text-file"

const MEMORY_FILE_NAME = "targets.json"
const UNSAFE_NAME_PATTERN = /^\.{1,2}$|[\\/\0]/

export interface TargetMemoryStore {
  readonly ensure: (repositoryName: string, now: Date) => Promise<TargetMemory>
  readonly dismiss: (repositoryName: string, targetId: string, now: Date) => Promise<void>
}

const isSafeName = (repositoryName: string): boolean =>
  repositoryName !== "" && !UNSAFE_NAME_PATTERN.test(repositoryName)

export class FileTargetMemoryStore implements TargetMemoryStore {
  private readonly dataPath: string

  public constructor(dataPath: string) {
    this.dataPath = dataPath
  }

  public readonly ensure = async (repositoryName: string, now: Date): Promise<TargetMemory> => {
    if (!isSafeName(repositoryName)) return startTargetMemory(now)
    const path = this.pathOf(repositoryName)
    const stored = await readTextOrNull(path)
    const memory = stored === null ? null : parseTargetMemory(stored)
    if (memory !== null) return memory
    const started = startTargetMemory(now)
    await writeText(path, formatTargetMemory(started))
    return started
  }

  public readonly dismiss = async (repositoryName: string, targetId: string, now: Date): Promise<void> => {
    if (!isSafeName(repositoryName)) return
    const memory = await this.ensure(repositoryName, now)
    await writeText(this.pathOf(repositoryName), formatTargetMemory(withDismissedTarget(memory, targetId)))
  }

  private readonly pathOf = (repositoryName: string): string => join(this.dataPath, repositoryName, MEMORY_FILE_NAME)
}
