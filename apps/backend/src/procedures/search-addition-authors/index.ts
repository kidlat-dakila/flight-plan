import { withIdentityAsSelf } from "@/procedures/add-repository/utils/find-selected-authors"
import {
  missingRepositoryMessage,
  notRepositoryMessage,
  planRepositoryAddition,
} from "@/procedures/add-repository/utils/plan-repository-addition"
import type { ProcedureContext } from "@/procedures/context"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import { buildAuthorSuggestions } from "@/procedures/search-repository-authors/utils/build-author-suggestions"
import type { AuthorSuggestions } from "@/procedures/search-repository-authors/utils/schemas"
import type { SearchAdditionAuthorsInput } from "./utils/schemas"

const NO_FOLDER_MESSAGE = "Choose the repository folder first."

const withoutSuggestions = (message: string): AuthorSuggestions => ({ options: [], message })

type FolderChoice
  = | { readonly kind: "chosen", readonly path: string }
    | { readonly kind: "unusable", readonly message: string }

const chooseFolder = async (
  input: SearchAdditionAuthorsInput,
  setup: Setup,
  context: ProcedureContext,
): Promise<FolderChoice> => {
  const listedRepositories = [...(await context.repositoryStore.listRegistered()), ...setup.repositories]
  if (input.repositoryName !== null) {
    const configured = listedRepositories.find((listed) => listed.name === input.repositoryName)
    return configured === undefined
      ? { kind: "unusable", message: missingRepositoryMessage(input.repositoryName) }
      : { kind: "chosen", path: configured.path }
  }
  if (input.path.trim() === "") return { kind: "unusable", message: NO_FOLDER_MESSAGE }
  const addition = planRepositoryAddition(listedRepositories, input.path)
  if (addition.kind === "rejected") return { kind: "unusable", message: addition.message }
  const { path } = addition.repository
  return (await context.setupEnvironment.isRepositoryFolder(path))
    ? { kind: "chosen", path }
    : { kind: "unusable", message: notRepositoryMessage(path) }
}

export const searchAdditionAuthors = async (
  input: SearchAdditionAuthorsInput,
  context: ProcedureContext,
): Promise<AuthorSuggestions> => {
  const setup = await context.setupStore.read()
  const folder = await chooseFolder(input, setup, context)
  if (folder.kind === "unusable") return withoutSuggestions(folder.message)
  const [forge, identity] = await Promise.all([
    context.setupEnvironment.findRepositoryForge(folder.path, setup.forges),
    context.setupEnvironment.readGitIdentity(folder.path),
  ])
  const found = await context.setupEnvironment.searchAuthors(
    { repositoryPath: folder.path, forge, forges: setup.forges },
    input.query,
  )
  return buildAuthorSuggestions(found, withIdentityAsSelf(input, identity), { role: input.role, forge, query: input.query })
}
