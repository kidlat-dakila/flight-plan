import { codeOf, groupOf, outlineOf, symbolsOf } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"

const FILE_PATH = "shop/deps.py"

const groupOfCode = (...lines: readonly string[]): StoredCodeGroupGraph => groupOf({ [FILE_PATH]: codeOf(...lines) })

const blockWithId = (group: StoredCodeGroupGraph, id: string): StoredCodeBlock => {
  const block = group.codeBlocks.find((candidate) => candidate.id === id)
  if (block === undefined) throw new Error(`There is no block ${id}.`)
  return block
}

const aliasNamesOf = (...lines: readonly string[]): string[] =>
  groupOfCode(...lines).codeBlocks.filter((block) => block.isAnnotatedAlias === true).map((block) => block.name ?? "")

describe("an Annotated value at the root of a Python file", () => {
  it("marks a value that is Annotated, written bare or through typing, as an annotated alias", () => {
    expect(aliasNamesOf(
      "import typing",
      "from typing import Annotated",
      "CurrentUser = Annotated[User, Depends(current_user)]",
      "SessionDep = typing.Annotated[Session, Depends(get_db)]",
      "UserIds = list[int]",
      "UserId = int",
    )).toStrictEqual(["CurrentUser", "SessionDep"])
  })
})

describe("the names inside an annotation of a Python parameter", () => {
  const group = groupOfCode(
    "from typing import Annotated",
    "from fastapi import Depends, Query",
    "def current_user():",
    "    return find_user()",
    "class Pagination:",
    "    def window(self):",
    "        return slice_of(self)",
    "def read_items(user: Annotated[User, Depends(current_user)], page: Annotated[Pagination, Depends()], q: Annotated[str, Query()]):",
    "    return list_items(user, page, q)",
  )

  it("reads a name inside a call of the annotation as a value handed to that call, and the others as types", () => {
    expect(symbolsOf(blockWithId(group, "shop/deps.py#root-argument-value@8:102"))).toStrictEqual([
      "type unopened-import typing:Annotated:Annotated",
      "call unopened-import fastapi:Query:Query",
    ])
    expect(symbolsOf(blockWithId(group, "shop/deps.py#effect-callback@8:46"))).toStrictEqual(["value internal-code-block shop/deps.py#function@3:1"])
  })

  it("hands the annotated type to the first slot of a call of its metadata that has no argument, and makes nothing of a call with no slot there", () => {
    expect(outlineOf(group, FILE_PATH).filter((line) => line.includes("effect"))).toStrictEqual([
      "  effect 8:38-8:59",
      "    effect-callback 0 8:46-8:58",
      "  effect-callback 0 8:78-8:88",
      "  effect 8:90-8:99",
    ])
    expect(symbolsOf(blockWithId(group, "shop/deps.py#effect-callback@8:78"))).toStrictEqual(["value internal-code-block shop/deps.py#class@5:1"])
  })
})
