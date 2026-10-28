import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"

export type BaseBranchFinding
  = | { readonly kind: "found", readonly baseBranch: string | null }
    | { readonly kind: "rejected", readonly message: string }

export const missingBranchMessage = (branchName: string): string => `${branchName} is not a branch of this repository.`

export const findBaseBranch = async (
  environment: Pick<SetupEnvironment, "detectMainBranch" | "listBranches">,
  repositoryPath: string,
  chosenBranch: string | null,
): Promise<BaseBranchFinding> => {
  if (chosenBranch === null) return { kind: "found", baseBranch: await environment.detectMainBranch(repositoryPath) }
  const branches = await environment.listBranches(repositoryPath)
  return branches?.some((branch) => branch.name === chosenBranch) === true
    ? { kind: "found", baseBranch: chosenBranch }
    : { kind: "rejected", message: missingBranchMessage(chosenBranch) }
}
