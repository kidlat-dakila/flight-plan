import type { ProcedureContext } from "@/procedures/context"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import { withBaseBranch } from "./utils/base-branch"
import { findBaseBranch } from "./utils/find-base-branch"
import type { SetBaseBranchInput } from "./utils/schemas"

export const setBaseBranch = async (input: SetBaseBranchInput, context: ProcedureContext): Promise<Setup | null> => {
  const setup = await context.setupStore.read()
  const repository = setup.repositories.find((listed) => listed.name === input.repositoryName)
  if (repository === undefined) return null
  const finding = await findBaseBranch(context.setupEnvironment, repository.path, input.baseBranch)
  if (finding.kind === "rejected" || finding.baseBranch === null) return null
  const changedSetup = withBaseBranch(setup, repository.name, finding.baseBranch)
  await context.setupStore.write(changedSetup)
  return changedSetup
}
