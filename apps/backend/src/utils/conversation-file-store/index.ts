import { readdir } from "node:fs/promises"
import { join } from "node:path"
import {
  appendEvents,
  EMPTY_CONVERSATION,
  reviewKeyId,
  type Conversation,
  type ConversationEvent,
  type JournalEntry,
} from "@/procedures/get-conversation/utils/conversation"
import type { ConversationStore } from "@/procedures/get-conversation/utils/conversation-store"
import { formatConversation, parseConversation } from "@/procedures/get-conversation/utils/stored-conversation"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { readTextOrNull, writeText } from "@/utils/text-file"

const CONVERSATIONS_FOLDER_NAME = "conversations"
const FILE_EXTENSION = ".json"
const UNSAFE_CHARACTER_PATTERN = /[^A-Za-z0-9_.-]/gu
const DOTS_ONLY_PATTERN = /^\.+$/
const DOT_ENCODED = "%2E"
const UNREADABLE_MESSAGE = "A saved conversation cannot be read."

const encodeCharacter = (character: string): string => encodeURIComponent(character).replaceAll("!", "%21")

export const toFileName = (name: string): string => {
  const encoded = name.replace(UNSAFE_CHARACTER_PATTERN, encodeCharacter)
  return DOTS_ONLY_PATTERN.test(encoded) ? encoded.replaceAll(".", DOT_ENCODED) : encoded
}

export const fromFileName = (fileName: string): string => decodeURIComponent(fileName)

export const readFolderNames = async (path: string): Promise<readonly string[]> => {
  try {
    return await readdir(path)
  } catch {
    return []
  }
}

export class FileConversationStore implements ConversationStore {
  private readonly rootPath: string
  private writes: ReadonlyMap<string, Promise<unknown>> = new Map()

  public constructor(dataPath: string) {
    this.rootPath = join(dataPath, CONVERSATIONS_FOLDER_NAME)
  }

  public readonly read = async (key: ReviewKey): Promise<Conversation> => await this.readPath(this.pathOf(key))

  public readonly append = async (key: ReviewKey, events: readonly ConversationEvent[]): Promise<readonly JournalEntry[]> =>
    await this.queue(key, async () => {
      const appending = appendEvents(await this.read(key), events)
      await writeText(this.pathOf(key), formatConversation(appending.conversation))
      return appending.entries
    })

  public readonly saveSessionId = async (key: ReviewKey, sessionId: string): Promise<void> => {
    await this.queue(key, async () => {
      const conversation = await this.read(key)
      await writeText(this.pathOf(key), formatConversation({ ...conversation, sessionId }))
    })
  }

  public readonly findKeyBySessionId = async (sessionId: string): Promise<ReviewKey | null> => {
    const keys = await this.listKeys()
    const conversations = await Promise.all(keys.map(async (key) => ({ key, conversation: await this.read(key) })))
    return conversations.find(({ conversation }) => conversation.sessionId === sessionId)?.key ?? null
  }

  private readonly listKeys = async (): Promise<readonly ReviewKey[]> => {
    const repositoryFolders = await readFolderNames(this.rootPath)
    const nested = await Promise.all(
      repositoryFolders.map(async (folder) => {
        const fileNames = await readFolderNames(join(this.rootPath, folder))
        return fileNames
          .filter((fileName) => fileName.endsWith(FILE_EXTENSION))
          .map((fileName) => ({
            repositoryName: fromFileName(folder),
            targetId: fromFileName(fileName.slice(0, -FILE_EXTENSION.length)),
          }))
      }),
    )
    return nested.flat()
  }

  private readonly readPath = async (path: string): Promise<Conversation> => {
    const text = await readTextOrNull(path)
    if (text === null) return EMPTY_CONVERSATION
    const conversation = parseConversation(text)
    if (conversation === null) throw new Error(UNREADABLE_MESSAGE)
    return conversation
  }

  private readonly pathOf = (key: ReviewKey): string =>
    join(this.rootPath, toFileName(key.repositoryName), `${toFileName(key.targetId)}${FILE_EXTENSION}`)

  private readonly queue = async <Result>(key: ReviewKey, task: () => Promise<Result>): Promise<Result> => {
    const id = reviewKeyId(key)
    const previous = this.writes.get(id) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(task)
    this.writes = new Map([...this.writes, [id, next]])
    return await next
  }
}
