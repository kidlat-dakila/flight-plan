import { codeOf, groupOf } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const FILE_PATH = "src/values.tsx"

const blocksOf = (...lines: readonly string[]): readonly StoredCodeBlock[] => groupOf({ [FILE_PATH]: codeOf(...lines) }).codeBlocks

const plainNamesOf = (...lines: readonly string[]): string[] =>
  blocksOf(...lines).filter((block) => block.isPlain === true).map((block) => block.name ?? "")

const returnedOf = (...lines: readonly string[]): string[] =>
  blocksOf(...lines).filter((block) => block.isReturned === true).map((block) => `${block.type} ${block.name ?? ""}`.trimEnd())

describe("a plain value at the root of a TypeScript file", () => {
  it("marks a value written out as it is as plain, at any depth", () => {
    expect(plainNamesOf(
      "export const MAX_RETRIES = 5",
      "export const BASE_URL = \"/api\"",
      `export const URL = \`\${BASE_URL}/users\``,
      "export const LIMITS = { page: [10, 20], max: 100 }",
      "export const cache = new Map()",
      "export enum Role { Admin = \"admin\" }",
      "export default { retries: 3 }",
    )).toStrictEqual(["MAX_RETRIES", "BASE_URL", "URL", "LIMITS", "cache", "Role", "default"])
  })

  it("does not mark a value with a call or a function anywhere inside it", () => {
    expect(plainNamesOf(
      "export const schema = z.object({})",
      "export const config = { key: getKey() }",
      `export const URL = \`\${prefix()}/users\``,
      "export const handlers = { save: () => 1 }",
      "export enum Size { Large = scale(2) }",
      "export const query = gql`{ users }`",
      "export const icon = <Icon />",
    )).toStrictEqual([])
  })
})

describe("a function a TypeScript function returns", () => {
  it("marks the function written in the return, as the body of an arrow function, or returned by name", () => {
    expect(returnedOf(
      "export const make = (id) => {",
      "  return (event) => save(id, event)",
      "}",
      "export const curry = (id) => (event) => save(id, event)",
      "export function named(id) {",
      "  function handle(event) { save(id, event) }",
      "  return handle",
      "}",
      "export function kept(id) {",
      "  const handle = (event) => save(id, event)",
      "  return handle",
      "}",
    )).toStrictEqual(["function", "function", "function handle", "function handle"])
  })

  it("does not mark a function that is only handed to a call or kept", () => {
    expect(returnedOf(
      "export const total = (items) => {",
      "  const prices = items.map((item) => item.price)",
      "  return sum(prices)",
      "}",
    )).toStrictEqual([])
  })
})
