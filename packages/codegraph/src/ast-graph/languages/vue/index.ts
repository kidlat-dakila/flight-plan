import { textOfTree } from "@/ast-graph/languages/file-syntax"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import type { Encapsulation, FileSyntax, FileVariable } from "@/ast-graph/types"
import type { ParsedVue } from "./parsed"
import { COMPONENT_NAME, readScriptEncapsulations, readScriptImports, readScriptReferences, readScriptVariables, type ParsedScript } from "./script"
import { componentRangeOf, openingTagOf, type Sfc } from "./sfc"
import { readVueStatements } from "./statements"
import { readVueSyntaxSites } from "./syntax-sites"
import { readTemplateNames } from "./template"

const isBefore = (one: Encapsulation, two: Encapsulation): number => one.range.start.line - two.range.start.line

const isComponentOf = (encapsulation: Encapsulation, sfc: Sfc): boolean => {
  const setup = sfc.scripts.find((script) => script.isSetup)
  return setup !== undefined && encapsulation.name === COMPONENT_NAME && isSameRange(encapsulation.range, rangeOf(setup.element))
}

const componentEncapsulationsOf = (sfc: Sfc, scripts: readonly ParsedScript[]): Encapsulation[] => {
  const written = readScriptEncapsulations(scripts)
  const { template } = sfc
  if (template === null) return written
  const body = written.find((encapsulation) => isComponentOf(encapsulation, sfc))
  const component: Encapsulation = {
    name: COMPONENT_NAME,
    kind: "function",
    range: componentRangeOf(sfc) ?? rangeOf(template),
    encapsulations: body?.encapsulations ?? [],
  }
  return [...written.filter((encapsulation) => encapsulation !== body), component]
}

const impliedComponentOf = (sfc: Sfc, declared: readonly FileVariable[]): FileVariable[] => {
  const holder = sfc.scripts.find((script) => script.isSetup)?.element ?? sfc.template
  const openingTag = holder === null ? null : openingTagOf(holder)
  if (openingTag === null || declared.some((variable) => variable.name === COMPONENT_NAME)) return []
  return [
    {
      name: COMPONENT_NAME,
      range: rangeOf(openingTag),
      scope: sfc.fileRange,
      spaces: ["value"],
      declarationType: "anonymous",
      type: "primitive",
    },
  ]
}

export const readVueSyntax = ({ tree, sfc, scripts, template }: ParsedVue, importedFilePaths: ReadonlyMap<string, string>): FileSyntax => {
  const names = readTemplateNames(sfc.template, template)
  const declared = [...readScriptVariables(scripts), ...names.variables]
  return {
    ...textOfTree(tree),
    rootEncapsulations: [...componentEncapsulationsOf(sfc, scripts)].sort(isBefore),
    fileVariables: [...declared, ...impliedComponentOf(sfc, declared)],
    importVariables: readScriptImports(scripts, importedFilePaths),
    references: [...readScriptReferences(scripts), ...names.references],
    exportAliases: [],
    reExports: [],
    syntaxSites: readVueSyntaxSites(sfc, scripts, template),
    statements: readVueStatements(sfc, scripts),
  }
}

export { parseVue, type ParsedVue } from "./parsed"
