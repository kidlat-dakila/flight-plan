import { z } from "zod"
import { MAIN_BRANCH_NAMES } from "./repository-activity"

export const listRecentRepositoriesInputSchema = z.strictObject({})

export const recentRepositoriesSchema = z.strictObject({
  repositories: z.array(
    z.strictObject({
      path: z.string(),
      name: z.string(),
      branch: z.enum(MAIN_BRANCH_NAMES),
      latestCommitAt: z.iso.datetime(),
      latestCommitLabel: z.string(),
      isAdded: z.boolean(),
      stateLabel: z.string().nullable(),
    }),
  ),
  message: z.string().nullable(),
})

export type ListRecentRepositoriesInput = z.infer<typeof listRecentRepositoriesInputSchema>
export type RecentRepositories = z.infer<typeof recentRepositoriesSchema>
