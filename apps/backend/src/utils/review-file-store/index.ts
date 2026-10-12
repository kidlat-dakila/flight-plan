import { join } from "node:path"
import type { ChatQuestion, Discussion, Publication } from "@/procedures/get-review/utils/discussion"
import type { ArtifactAmend, ReviewKey, ReviewStore } from "@/procedures/get-review/utils/review-store"
import type { ReviewTargetDetail } from "@/procedures/get-review/utils/review-target-detail"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { formatStoredReview, parseStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { fromFileName, readFolderNames, toFileName } from "@/utils/conversation-file-store"
import { readTextOrNull, removeFile, writeText } from "@/utils/text-file"
import type { ReviewedMarks } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"

const REVIEWS_FOLDER_NAME = "reviews"
const FILE_EXTENSION = ".flightplan"
const UNREADABLE_MESSAGE = "A saved review artifact cannot be read."

export class FileReviewStore implements ReviewStore {
  private readonly rootPath: string
  private readonly sampleStore: ReviewStore
  private amendTurns: ReadonlyMap<string, Promise<unknown>> = new Map()

  public constructor(dataPath: string, sampleStore: ReviewStore) {
    this.rootPath = join(dataPath, REVIEWS_FOLDER_NAME)
    this.sampleStore = sampleStore
  }

  public readonly findArtifact = async (key: ReviewKey): Promise<ReviewArtifact | null> =>
    (await this.readScaffold(key))?.artifact ?? await this.sampleStore.findArtifact(key)

  public readonly listTargetIds = async (repositoryName: string): Promise<readonly string[]> => {
    const [fileNames, sampleTargetIds] = await Promise.all([
      readFolderNames(join(this.rootPath, toFileName(repositoryName))),
      this.sampleStore.listTargetIds(repositoryName),
    ])
    const savedTargetIds = fileNames
      .filter((fileName) => fileName.endsWith(FILE_EXTENSION))
      .map((fileName) => fromFileName(fileName.slice(0, -FILE_EXTENSION.length)))
    return [...new Set([...savedTargetIds, ...sampleTargetIds])]
  }

  public readonly findRequest = async (key: ReviewKey): Promise<ReviewRequest | null> =>
    (await this.readScaffold(key))?.request ?? await this.sampleStore.findRequest(key)

  public readonly writeScaffold = async (key: ReviewKey, scaffold: ReviewScaffold): Promise<void> => {
    await writeText(this.pathOf(key), formatStoredReview(scaffold))
  }

  public readonly deleteScaffold = async (key: ReviewKey): Promise<void> => {
    await removeFile(this.pathOf(key))
    await this.sampleStore.deleteScaffold(key)
  }

  public readonly amendArtifact = async <Outcome>(key: ReviewKey, amend: ArtifactAmend<Outcome>): Promise<Outcome | null> => {
    const path = this.pathOf(key)
    const earlierTurns = this.amendTurns.get(path) ?? Promise.resolve()
    const turn = earlierTurns.then(async () => await this.amendStored(key, amend))
    this.amendTurns = new Map([...this.amendTurns, [path, turn.catch(() => null)]])
    return await turn
  }

  public readonly findTargetDetail = async (key: ReviewKey): Promise<ReviewTargetDetail | null> =>
    await this.sampleStore.findTargetDetail(key)

  public readonly readReviewedMarks = async (key: ReviewKey): Promise<ReviewedMarks> =>
    await this.sampleStore.readReviewedMarks(key)

  public readonly writeReviewedMarks = async (key: ReviewKey, marks: ReviewedMarks): Promise<void> => {
    await this.sampleStore.writeReviewedMarks(key, marks)
  }

  public readonly readDiscussion = async (key: ReviewKey): Promise<Discussion> =>
    await this.sampleStore.readDiscussion(key)

  public readonly writeDiscussion = async (key: ReviewKey, discussion: Discussion): Promise<void> => {
    await this.sampleStore.writeDiscussion(key, discussion)
  }

  public readonly readPublications = async (key: ReviewKey): Promise<readonly Publication[]> =>
    await this.sampleStore.readPublications(key)

  public readonly writePublications = async (key: ReviewKey, publications: readonly Publication[]): Promise<void> => {
    await this.sampleStore.writePublications(key, publications)
  }

  public readonly readChatQuestions = async (key: ReviewKey): Promise<readonly ChatQuestion[]> =>
    await this.sampleStore.readChatQuestions(key)

  public readonly writeChatQuestions = async (key: ReviewKey, questions: readonly ChatQuestion[]): Promise<void> => {
    await this.sampleStore.writeChatQuestions(key, questions)
  }

  private readonly amendStored = async <Outcome>(key: ReviewKey, amend: ArtifactAmend<Outcome>): Promise<Outcome | null> => {
    const scaffold = await this.readScaffold(key)
    if (scaffold === null) return await this.sampleStore.amendArtifact(key, amend)
    const amendment = amend(scaffold.artifact)
    if (amendment.artifact !== null) await this.writeScaffold(key, { ...scaffold, artifact: amendment.artifact })
    return amendment.outcome
  }

  private readonly readScaffold = async (key: ReviewKey): Promise<ReviewScaffold | null> => {
    const text = await readTextOrNull(this.pathOf(key))
    if (text === null) return null
    const scaffold = parseStoredReview(text)
    if (scaffold === null) throw new Error(UNREADABLE_MESSAGE)
    return scaffold
  }

  private readonly pathOf = (key: ReviewKey): string =>
    join(this.rootPath, toFileName(key.repositoryName), `${toFileName(key.targetId)}${FILE_EXTENSION}`)
}
