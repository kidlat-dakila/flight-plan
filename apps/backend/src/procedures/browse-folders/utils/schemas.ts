import { z } from "zod"

export const FOLDER_KINDS = ["repository", "added-repository", "folder"] as const

export const FOLDER_PURPOSES = ["repository", "install-folder"] as const

export const browseFoldersInputSchema = z.strictObject({
  path: z.string().nullable(),
  purpose: z.enum(FOLDER_PURPOSES),
})

export const folderBrowserSchema = z.strictObject({
  path: z.string(),
  parentPath: z.string().nullable(),
  folders: z.array(
    z.strictObject({ name: z.string(), path: z.string(), kind: z.enum(FOLDER_KINDS), kindLabel: z.string() }),
  ),
  message: z.string().nullable(),
})

export type BrowseFoldersInput = z.infer<typeof browseFoldersInputSchema>
export type FolderPurpose = BrowseFoldersInput["purpose"]
export type FolderBrowser = z.infer<typeof folderBrowserSchema>
