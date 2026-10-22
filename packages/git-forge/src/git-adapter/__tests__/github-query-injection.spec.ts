import fc from "fast-check"
import { Kind, parse, valueFromASTUntyped, type DocumentNode, type FieldNode, type ObjectFieldNode, type SelectionNode } from "graphql"
import { describe, expect, it } from "vitest"
import {
  buildDiscussionQuery,
  buildHistoryQuery,
  buildPeopleQuery,
  buildRecentHistoryQuery,
  buildThreadReplyMutation,
  buildThreadResolutionMutation,
} from "@/git-adapter/custom-providers/extended-github-provider"

const GRAPHQL_SYNTAX_CHARACTERS = ["\"", "\\", "\n", "\r", "\t", "{", "}", "(", ")", ":", ",", "#", "$", "u", "0", " ", "a", " "]
const SEARCH_FILTER_PATTERN = /^repo:[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+ is:pr( author:[A-Za-z0-9-]+)? sort:updated-desc$/
const SLUG_SEGMENT = /^[A-Za-z0-9._-]{1,20}$/
const LOGIN = /^@?[A-Za-z0-9][A-Za-z0-9-]{0,10}$/
const HISTORY_LIMIT = 50

const typedText = fc.oneof(
  fc.string({ unit: "binary", maxLength: 60 }),
  fc.string({ unit: fc.constantFrom(...GRAPHQL_SYNTAX_CHARACTERS), maxLength: 60 }),
)

const slugSegment = fc.oneof(fc.stringMatching(SLUG_SEGMENT), typedText)

const authorLogin = fc.oneof(fc.stringMatching(LOGIN), typedText)

const fieldsIn = (selections: readonly SelectionNode[]): FieldNode[] =>
  selections.flatMap((selection) => (selection.kind === Kind.FIELD ? [selection, ...fieldsIn(selection.selectionSet?.selections ?? [])] : []))

const fieldsNamed = (document: DocumentNode, name: string): FieldNode[] =>
  document.definitions
    .flatMap((definition) => (definition.kind === Kind.OPERATION_DEFINITION ? fieldsIn(definition.selectionSet.selections) : []))
    .filter((field) => field.name.value === name)

const argumentOf = (field: FieldNode, name: string): unknown => {
  const argument = field.arguments?.find((candidate) => candidate.name.value === name)
  return argument === undefined ? undefined : valueFromASTUntyped(argument.value)
}

const inputFieldsOf = (field: FieldNode): readonly ObjectFieldNode[] => {
  const input = field.arguments?.find((candidate) => candidate.name.value === "input")?.value
  return input?.kind === Kind.OBJECT ? input.fields : []
}

const onlyFieldOf = (document: DocumentNode, name: string): FieldNode => {
  const fields = fieldsNamed(document, name)
  expect(fields).toHaveLength(1)
  return fields[0]
}

describe("GitHub GraphQL documents built from text a person or a forge supplies", () => {
  it("keeps a reply's body inside its string, whatever the reviewer typed", () => {
    fc.assert(fc.property(typedText, typedText, (threadId, body) => {
      const document = parse(buildThreadReplyMutation(threadId, body))
      const reply = onlyFieldOf(document, "addPullRequestReviewThreadReply")
      const input = Object.fromEntries(inputFieldsOf(reply).map((field) => [field.name.value, valueFromASTUntyped(field.value)]))

      expect(document.definitions).toHaveLength(1)
      expect(input).toStrictEqual({ pullRequestReviewThreadId: threadId, body })
    }))
  })

  it("keeps a thread id inside its string when a thread is resolved or reopened", () => {
    fc.assert(fc.property(typedText, fc.boolean(), (threadId, isResolved) => {
      const document = parse(buildThreadResolutionMutation(threadId, isResolved))
      const resolution = onlyFieldOf(document, isResolved ? "resolveReviewThread" : "unresolveReviewThread")
      const input = Object.fromEntries(inputFieldsOf(resolution).map((field) => [field.name.value, valueFromASTUntyped(field.value)]))

      expect(document.definitions).toHaveLength(1)
      expect(input).toStrictEqual({ threadId })
    }))
  })

  it("builds a pull request search only from a valid repository and valid logins", () => {
    fc.assert(fc.property(slugSegment, slugSegment, fc.array(authorLogin, { maxLength: 4 }), (owner, repo, authors) => {
      const query = buildHistoryQuery(owner, repo, authors, HISTORY_LIMIT)
      if (query === null) return
      const searches = fieldsNamed(parse(query), "search")

      expect(searches.length).toBeGreaterThan(0)
      searches.forEach((search) => {
        expect(argumentOf(search, "query")).toMatch(SEARCH_FILTER_PATTERN)
      })
    }))
  })

  it("builds the recent pull request search only from a valid repository", () => {
    fc.assert(fc.property(slugSegment, slugSegment, (owner, repo) => {
      const query = buildRecentHistoryQuery(owner, repo, HISTORY_LIMIT)
      if (query === null) return
      const search = onlyFieldOf(parse(query), "search")

      expect(argumentOf(search, "query")).toMatch(SEARCH_FILTER_PATTERN)
      expect(argumentOf(search, "query")).toContain(`repo:${owner}/${repo} `)
    }))
  })

  it("keeps what the reviewer types into the people search inside its string", () => {
    fc.assert(fc.property(slugSegment, slugSegment, typedText, (owner, repo, typed) => {
      const query = buildPeopleQuery(owner, repo, typed)
      if (query === null) return
      const document = parse(query)
      const repository = onlyFieldOf(document, "repository")
      const people = onlyFieldOf(document, "assignableUsers")

      expect(argumentOf(repository, "owner")).toBe(owner)
      expect(argumentOf(repository, "name")).toBe(repo)
      expect(argumentOf(people, "query")).toBe(typed.trim() === "" ? undefined : typed.trim())
    }))
  })

  it("reads a pull request's discussion only from a valid repository and number", () => {
    fc.assert(fc.property(slugSegment, slugSegment, fc.nat(), (owner, repo, number) => {
      const query = buildDiscussionQuery(owner, repo, number)
      if (query === null) return
      const document = parse(query)

      expect(argumentOf(onlyFieldOf(document, "repository"), "owner")).toBe(owner)
      expect(argumentOf(onlyFieldOf(document, "repository"), "name")).toBe(repo)
      expect(argumentOf(onlyFieldOf(document, "pullRequest"), "number")).toBe(number)
    }))
  })
})
