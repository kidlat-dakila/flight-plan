import { addedLabelOf, type AddedPaths } from "@/procedures/get-setup/utils/added-paths"
import type { FolderEntry, FolderListing } from "@/procedures/get-setup/utils/setup-environment"
import type { FolderBrowser } from "./schemas"

const EMPTY_FOLDER_MESSAGE = "This folder has no folders inside it."

const byName = (first: FolderEntry, second: FolderEntry): number => first.name.localeCompare(second.name)

type BrowsedFolder = FolderBrowser["folders"][number]

const FOLDER_LABEL = "Folder"
const REPOSITORY_LABEL = "Repository"

const toBrowsedFolder = (folder: FolderEntry, addedPaths: AddedPaths): BrowsedFolder => {
  const { name, path } = folder
  if (!folder.isRepository) return { name, path, kind: "folder", kindLabel: FOLDER_LABEL }
  const addedLabel = addedLabelOf(path, addedPaths)
  return addedLabel === null
    ? { name, path, kind: "repository", kindLabel: REPOSITORY_LABEL }
    : { name, path, kind: "added-repository", kindLabel: addedLabel }
}

export const buildFolderBrowser = (listing: FolderListing, addedPaths: AddedPaths): FolderBrowser => ({
  path: listing.path,
  parentPath: listing.parentPath,
  folders: [...listing.folders].sort(byName).map((folder) => toBrowsedFolder(folder, addedPaths)),
  message: listing.folders.length === 0 ? EMPTY_FOLDER_MESSAGE : null,
})
