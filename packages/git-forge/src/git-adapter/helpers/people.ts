import type { Person } from "@/git-adapter/types"

const AUTHOR_HANDLE_PREFIX = "@"

export const normalizeLogin = (login: string): string => login.replace(AUTHOR_HANDLE_PREFIX, "").trim().toLowerCase()

const combine = (earlier: Person | undefined, later: Person): Person =>
  earlier === undefined
    ? later
    : {
        login: earlier.login,
        name: earlier.name ?? later.name,
        avatarUrl: earlier.avatarUrl === "" ? later.avatarUrl : earlier.avatarUrl,
      }

export const mergePeople = (found: readonly Person[]): Person[] => {
  const byLogin = found
    .filter((person) => person.login !== "")
    .reduce(
      (merged, person) => {
        const key = normalizeLogin(person.login)
        return new Map([...merged, [key, combine(merged.get(key), person)]])
      },
      new Map<string, Person>(),
    )
  return [...byLogin.values()]
}

export const matchPeople = (people: readonly Person[], query: string): Person[] => {
  const typedText = query.trim().toLowerCase()
  return people.filter((person) =>
    [person.login, person.name ?? ""].some((text) => text.toLowerCase().includes(typedText)))
}
