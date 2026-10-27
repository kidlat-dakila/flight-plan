import type { Repository } from "@/procedures/list-repositories/utils/repository"

export type RepositoryAddition
  = | { readonly kind: "accepted", readonly repository: Repository }
    | { readonly kind: "rejected", readonly message: string }

export type ListedRepository = Pick<Repository, "name" | "path">

export type RegisteredRepository = Pick<Repository, "name" | "path" | "baseBranch">

const ABSOLUTE_PATH_PATTERN = /^(?:\/|[A-Za-z]:[\\/])/
const LAST_SEGMENT_PATTERN = /[^\\/]+$/
const TRAILING_SEPARATOR_PATTERN = /[\\/]+$/
const RELATIVE_NAME_PATTERN = /^\.{1,2}$/

export const notRepositoryMessage = (path: string): string => `${path} is not a git repository.`

export const missingRepositoryMessage = (name: string): string => `${name} is no longer on the list.`

const withoutTrailingSeparator = (path: string): string => path.trim().replace(TRAILING_SEPARATOR_PATTERN, "")

const folderName = (path: string): string => LAST_SEGMENT_PATTERN.exec(path)?.[0] ?? ""

export const isAbsolutePath = (path: string): boolean => ABSOLUTE_PATH_PATTERN.test(path.trim())

const reject = (message: string): RepositoryAddition => ({ kind: "rejected", message })

export const planRepositoryAddition = (repositories: readonly ListedRepository[], enteredPath: string): RepositoryAddition => {
  const path = withoutTrailingSeparator(enteredPath)
  const name = folderName(path)
  if (!isAbsolutePath(enteredPath) || name === "" || RELATIVE_NAME_PATTERN.test(name)) {
    return reject("Enter the full path to a repository folder, for example /Users/you/projects/storefront.")
  }
  if (repositories.some((repository) => repository.path === path)) {
    return reject(`${path} is already on the list.`)
  }
  if (repositories.some((repository) => repository.name === name)) {
    return reject(`A repository named ${name} is already on the list.`)
  }
  return {
    kind: "accepted",
    repository: { name, path, forge: "git", forgeSlug: null, problem: null, targets: [], baseBranch: null },
  }
}
