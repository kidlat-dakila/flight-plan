import type { ProcedureContext } from "@/procedures/context"
import { authorForgeOf } from "@/procedures/get-setup/utils/setup"
import { buildAuthorForm } from "./utils/build-author-form"
import type { AuthorForm, GetAuthorFormInput } from "./utils/schemas"

export const getAuthorForm = async (input: GetAuthorFormInput, context: ProcedureContext): Promise<AuthorForm> => {
  const setup = await context.setupStore.read()
  const path = input.path.trim()
  const isRepository = path !== "" && (await context.setupEnvironment.isRepositoryFolder(path))
  if (!isRepository) return buildAuthorForm(authorForgeOf(setup), null)
  const [forge, identity] = await Promise.all([
    context.setupEnvironment.findRepositoryForge(path, setup.forges),
    context.setupEnvironment.readGitIdentity(path),
  ])
  return buildAuthorForm(forge, identity)
}
