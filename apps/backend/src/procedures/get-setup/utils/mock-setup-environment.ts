import type { RepositoryAuthor } from "./setup"
import type { AuthorSource, FolderEntry, FolderListing, SetupEnvironment } from "./setup-environment"

const HOME_PATH = "/Users/dev"
const ROOT_PATH = "/"
const PATH_SEPARATOR = "/"

interface MockFolder {
  readonly path: string
  readonly isRepository: boolean
}

const MOCK_FOLDERS: readonly MockFolder[] = [
  { path: "/Users", isRepository: false },
  { path: "/Users/dev", isRepository: false },
  { path: "/Users/dev/Documents", isRepository: false },
  { path: "/Users/dev/projects", isRepository: false },
  { path: "/Users/dev/projects/archive", isRepository: false },
  { path: "/Users/dev/projects/archive/old-storefront", isRepository: true },
  { path: "/Users/dev/projects/checkout-web", isRepository: true },
  { path: "/Users/dev/projects/design-tokens", isRepository: true },
  { path: "/Users/dev/projects/docs-site", isRepository: true },
  { path: "/Users/dev/projects/flight-plan", isRepository: true },
  { path: "/Users/dev/projects/ledger-api", isRepository: true },
  { path: "/Users/dev/projects/meeting-notes", isRepository: false },
  { path: "/Users/dev/projects/payments-service", isRepository: true },
  { path: "/Users/dev/projects/storefront", isRepository: true },
  { path: "/Users/dev/work", isRepository: false },
  { path: "/Users/dev/work/mobile-app", isRepository: true },
]

interface MockPerson {
  readonly name: string
  readonly email: string
  readonly handle: string
}

const MOCK_PEOPLE: readonly MockPerson[] = [
  { name: "Amara Diallo", email: "amara@acme.example", handle: "@amara" },
  { name: "Dev Harper", email: "dev@acme.example", handle: "@dev-harper" },
  { name: "Jonas Lindqvist", email: "jonas@acme.example", handle: "@jonas" },
  { name: "Lena Okafor", email: "lena@acme.example", handle: "@lena" },
  { name: "Mira Sandoval", email: "mira@acme.example", handle: "@mira" },
  { name: "Teo Marchetti", email: "teo@acme.example", handle: "@teo" },
]

const parentPathOf = (path: string): string | null => {
  if (path === ROOT_PATH) return null
  const parentPath = path.slice(0, path.lastIndexOf(PATH_SEPARATOR))
  return parentPath === "" ? ROOT_PATH : parentPath
}

const folderNameOf = (path: string): string => path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1)

const hasFolder = (path: string): boolean => path === ROOT_PATH || MOCK_FOLDERS.some((folder) => folder.path === path)

const toFolderEntry = (folder: MockFolder): FolderEntry => ({
  name: folderNameOf(folder.path),
  path: folder.path,
  isRepository: folder.isRepository,
})

const listMockFolders = (requestedPath: string | null): FolderListing | null => {
  const path = requestedPath ?? HOME_PATH
  if (!hasFolder(path)) return null
  return {
    path,
    parentPath: parentPathOf(path),
    folders: MOCK_FOLDERS.filter((folder) => parentPathOf(folder.path) === path).map(toFolderEntry),
  }
}

const containsText = (text: string, query: string): boolean => text.toLowerCase().includes(query.trim().toLowerCase())

const searchMockRepositoryFolders = (query: string): readonly string[] =>
  MOCK_FOLDERS.filter((folder) => folder.isRepository && containsText(folder.path, query)).map((folder) => folder.path)

const toAuthor = (person: MockPerson, source: AuthorSource): RepositoryAuthor =>
  source.forge === "git"
    ? { id: person.email, name: person.name, detail: person.email, avatarUrl: null }
    : { id: person.handle, name: person.name, detail: person.handle, avatarUrl: null }

const mockAuthorsOf = (source: AuthorSource): readonly RepositoryAuthor[] =>
  MOCK_PEOPLE.map((person) => toAuthor(person, source))

const matchesAuthor = (author: RepositoryAuthor, query: string): boolean =>
  containsText(author.name, query) || containsText(author.detail, query)

export const createMockSetupEnvironment = (): SetupEnvironment => ({
  detectAgents: async () =>
    await Promise.resolve([
      { agent: "claude", installPath: "/Users/dev/.claude" },
      { agent: "codex", installPath: "/Users/dev/.codex" },
      { agent: "cursor", installPath: null },
    ]),
  probeForgeClis: async () =>
    await Promise.resolve([
      { cli: "gh", state: { kind: "signed-in", account: "dev-harper" } },
      { cli: "glab", state: { kind: "missing" } },
    ]),
  searchRepositoryFolders: async (query) => await Promise.resolve(searchMockRepositoryFolders(query)),
  listFolders: async (path) => await Promise.resolve(listMockFolders(path)),
  isRepositoryFolder: async (path) =>
    await Promise.resolve(MOCK_FOLDERS.some((folder) => folder.path === path && folder.isRepository)),
  searchAuthors: async (source, query) =>
    await Promise.resolve(mockAuthorsOf(source).filter((author) => matchesAuthor(author, query))),
  findAuthor: async (source, authorId) =>
    await Promise.resolve(mockAuthorsOf(source).find((author) => author.id === authorId) ?? null),
  saveForgeCredential: async () => {
    await Promise.resolve()
  },
})
