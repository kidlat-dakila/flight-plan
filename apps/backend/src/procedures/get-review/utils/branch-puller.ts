export type BranchPull
  = | { readonly kind: "pulled" }
    | { readonly kind: "local-only" }
    | { readonly kind: "failed", readonly reason: string }

export type BranchPuller = (repositoryPath: string, branchName: string) => Promise<BranchPull>

const LOCAL_ONLY: BranchPull = { kind: "local-only" }

export const skipBranchPull: BranchPuller = async () => await Promise.resolve(LOCAL_ONLY)

export const pullFailureMessage = (reason: string): string =>
  `The branch could not be pulled, so the Flight Plan was left as it is: ${reason}`
