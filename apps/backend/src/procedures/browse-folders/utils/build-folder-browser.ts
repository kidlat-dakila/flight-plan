import { addedLabelOf, type AddedPaths } from "@/procedures/get-setup/utils/added-paths"
import type { FolderEntry, FolderListing } from "@/procedures/get-setup/utils/setup-environment"
import type { FolderBrowser, FolderPurpose } from "./schemas"

const EMPTY_FOLDER_MESSAGE = "This folder has no folders inside it."

const byName = (first: FolderEntry, second: FolderEntry): number => first.name.localeCompare(second.name)

type BrowsedFolder = FolderBrowser["folders"][number]

const FOLDER_LABEL = "Folder"
const REPOSITORY_LABEL = "Repository"

const HIDDEN_NAME_PREFIX = "."

const isHidden = (folder: FolderEntry): boolean => folder.name.startsWith(HIDDEN_NAME_PREFIX)

const toPlainFolder = ({ name, path }: FolderEntry): BrowsedFolder => ({ name, path, kind: "folder", kindLabel: FOLDER_LABEL })

const toBrowsedFolder = (folder: FolderEntry, addedPaths: AddedPaths): BrowsedFolder => {
  const { name, path } = folder
  if (!folder.isRepository) return toPlainFolder(folder)
  const addedLabel = addedLabelOf(path, addedPaths)
  return addedLabel === null
    ? { name, path, kind: "repository", kindLabel: REPOSITORY_LABEL }
    : { name, path, kind: "added-repository", kindLabel: addedLabel }
}

const browsedFoldersFor = (
  folders: readonly FolderEntry[],
  addedPaths: AddedPaths,
  purpose: FolderPurpose,
): BrowsedFolder[] =>
  purpose === "install-folder"
    ? folders.map(toPlainFolder)
    : folders.filter((folder) => !isHidden(folder)).map((folder) => toBrowsedFolder(folder, addedPaths))

export const buildFolderBrowser = (listing: FolderListing, addedPaths: AddedPaths, purpose: FolderPurpose): FolderBrowser => {
  const folders = browsedFoldersFor([...listing.folders].sort(byName), addedPaths, purpose)
  return {
    path: listing.path,
    parentPath: listing.parentPath,
    folders,
    message: folders.length === 0 ? EMPTY_FOLDER_MESSAGE : null,
  }
}
