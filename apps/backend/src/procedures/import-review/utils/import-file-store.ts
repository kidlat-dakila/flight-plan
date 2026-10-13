import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export interface ImportFileStore {
  readonly pathOf: (key: ReviewKey) => string
  readonly read: (key: ReviewKey) => Promise<string | null>
  readonly remove: (key: ReviewKey) => Promise<void>
}

const SAMPLE_FOLDER_PATH = "/sample-imports"

const samplePathOf = (key: ReviewKey): string => `${SAMPLE_FOLDER_PATH}/${key.repositoryName}/${key.targetId}.json`

export class InMemoryImportFileStore implements ImportFileStore {
  private texts: ReadonlyMap<string, string> = new Map()

  public readonly pathOf = samplePathOf

  public readonly read = async (key: ReviewKey): Promise<string | null> =>
    await Promise.resolve(this.texts.get(samplePathOf(key)) ?? null)

  public readonly remove = async (key: ReviewKey): Promise<void> => {
    this.texts = new Map([...this.texts].filter(([path]) => path !== samplePathOf(key)))
    await Promise.resolve()
  }

  public readonly write = (key: ReviewKey, text: string): void => {
    this.texts = new Map([...this.texts, [samplePathOf(key), text]])
  }
}
