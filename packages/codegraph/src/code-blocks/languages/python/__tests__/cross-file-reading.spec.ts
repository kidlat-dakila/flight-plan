import type { SyntaxTree } from "@/ast-graph/parser"
import * as queryNodes from "@/ast-graph/query-nodes"
import { buildStoredCodeGroupGraph } from "@/code-blocks/build-group"

vi.mock("@/ast-graph/query-nodes", async (importOriginal) => {
  const original = await importOriginal<typeof queryNodes>()
  return { ...original, nodesMatching: vi.fn(original.nodesMatching) }
})

const BLUEPRINTS_PATH = "shop/blueprints.py"
const VIEWS_PATH = "shop/views.py"
const FEW_IMPORTS = 4
const MANY_IMPORTS = 40

const blueprintNames = (count: number): string[] => Array.from({ length: count }, (_, position) => `orders_${String(position)}`)

const blueprintsSource = (count: number): string =>
  ["from flask import Blueprint", "", ...blueprintNames(count).map((name) => `${name} = Blueprint("${name}", __name__)`)].join("\n")

const viewsSource = (count: number): string =>
  [`from shop.blueprints import ${blueprintNames(count).join(", ")}`, "", ...blueprintNames(count).map((name) => `@${name}.route("/${name}")\ndef show_${name}():\n    return "${name}"\n`)].join("\n")

const isBlueprintsTree = (tree: SyntaxTree): boolean => tree.rootNode.text.startsWith("from flask import Blueprint")

const queriesOfBlueprintsWhenImporting = (count: number): number => {
  vi.mocked(queryNodes.nodesMatching).mockClear()
  buildStoredCodeGroupGraph([
    { filePath: BLUEPRINTS_PATH, source: blueprintsSource(count), importedFilePaths: new Map(), importedBy: [VIEWS_PATH], diffs: [] },
    { filePath: VIEWS_PATH, source: viewsSource(count), importedFilePaths: new Map(blueprintNames(count).map((name) => [`shop.blueprints:${name}`, BLUEPRINTS_PATH] as const)), importedBy: [], diffs: [] },
  ])
  return vi.mocked(queryNodes.nodesMatching).mock.calls.filter(([, tree]) => isBlueprintsTree(tree)).length
}

describe("reading names imported from another Python file", () => {
  it("reads the imported file's bindings once, however many of its names are followed", () => {
    expect(queriesOfBlueprintsWhenImporting(MANY_IMPORTS)).toBe(queriesOfBlueprintsWhenImporting(FEW_IMPORTS))
  })
})
