import type { Capability, GitAdapter } from "@/utils/git-adapter/types"

const refuse = async (): Promise<never> => await Promise.reject(new Error("not used in this test"))

export const adapterWith = (id: GitAdapter["id"], parts: Partial<GitAdapter>): GitAdapter => ({
  id,
  name: id,
  capabilities: new Set<Capability>(),
  repo: "acme/storefront",
  supports: () => true,
  reviewFilters: () => [],
  listTargets: refuse,
  target: refuse,
  listLabels: refuse,
  reviewers: refuse,
  headSha: refuse,
  diff: refuse,
  compare: refuse,
  blob: refuse,
  permalink: () => "",
  viewer: refuse,
  searchPeople: refuse,
  listPullRequests: refuse,
  listBranches: refuse,
  branchStart: refuse,
  fetchRemotes: refuse,
  ...parts,
})
