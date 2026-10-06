import type { SyntaxTree } from "@/ast-graph/parser"
import { clipLines, containsLines, containsPosition, containsRange, isSameRange } from "@/ast-graph/source-range"
import type {
  Declaration,
  DeclarationType,
  DiffLocation,
  Encapsulation,
  ExportAlias,
  FileVariable,
  ImportedSymbol,
  ImportVariable,
  LineRange,
  ReExport,
  SourceRange,
  SymbolReference,
  SymbolSpace,
  SymbolTarget,
  Usage,
} from "@/ast-graph/types"

export interface ASTGraphFileInput {
  readonly filePath: string
  readonly gitSha: string
  readonly tree: SyntaxTree
  readonly importedBy: readonly string[]
  readonly importsTo: readonly string[]
  readonly diffLines: readonly LineRange[]
  readonly importedFilePaths: ReadonlyMap<string, string>
}

export const NAMESPACE_IMPORT = "*"
export const DEFAULT_EXPORT = "default"

const ARGUMENT: DeclarationType = "argument"

const EVERY_SPACE: readonly SymbolSpace[] = ["value", "type"]

const narrowest = <Ranged>(candidates: readonly Ranged[], rangeOf: (candidate: Ranged) => SourceRange): Ranged | null =>
  candidates.reduce<Ranged | null>(
    (best, candidate) => (best === null || containsRange(rangeOf(best), rangeOf(candidate)) ? candidate : best),
    null,
  )

const findEncapsulationIn = <Target>(
  encapsulations: readonly Encapsulation[],
  target: Target,
  holds: (range: SourceRange, target: Target) => boolean,
): Encapsulation | null => {
  const holder = encapsulations.find((encapsulation) => holds(encapsulation.range, target))
  if (holder === undefined) return null
  return findEncapsulationIn(holder.encapsulations, target, holds) ?? holder
}

const findPathIn = (encapsulations: readonly Encapsulation[], target: Encapsulation): Encapsulation[] =>
  encapsulations.flatMap((holder) => {
    if (holder === target) return [holder]
    const nested = findPathIn(holder.encapsulations, target)
    return nested.length === 0 ? [] : [holder, ...nested]
  })

const forwardedNamesOf = ({ importedName, exportedName }: ReExport, name: string): string[] => {
  if (importedName === name) return [exportedName]
  if (importedName !== NAMESPACE_IMPORT) return []
  if (exportedName !== NAMESPACE_IMPORT) return [exportedName]
  return name === DEFAULT_EXPORT ? [] : [name]
}

const diffLocationIn = (rootEncapsulation: Encapsulation, lines: LineRange): DiffLocation[] => {
  const diffLoC = clipLines(rootEncapsulation.range, lines)
  if (diffLoC === null) return []
  const parentEncapsulation = findEncapsulationIn(rootEncapsulation.encapsulations, diffLoC, containsLines) ?? rootEncapsulation
  return [{ diffLoC, rootEncapsulation, parentEncapsulation }]
}

const locateDiffLines = (rootEncapsulations: readonly Encapsulation[], diffLines: readonly LineRange[]): DiffLocation[] =>
  diffLines.flatMap((lines) => rootEncapsulations.flatMap((rootEncapsulation) => diffLocationIn(rootEncapsulation, lines)))

export abstract class BaseASTGraphFile {
  public readonly filePath: string
  public readonly gitSha: string
  public readonly importedBy: readonly string[]
  public readonly importsTo: readonly string[]

  private readonly rootEncapsulations: readonly Encapsulation[]
  private readonly fileVariables: readonly FileVariable[]
  private readonly fileImportVariables: readonly ImportVariable[]
  private readonly references: readonly SymbolReference[]
  private readonly exportAliases: readonly ExportAlias[]
  private readonly reExports: readonly ReExport[]
  private readonly diffLocations: readonly DiffLocation[]

  public constructor({ filePath, gitSha, tree, importedBy, importsTo, diffLines, importedFilePaths }: ASTGraphFileInput) {
    this.filePath = filePath
    this.gitSha = gitSha
    this.importedBy = importedBy
    this.importsTo = importsTo
    this.rootEncapsulations = this.extractRootEncapsulations(tree)
    this.fileVariables = this.extractFileVariables(tree)
    this.fileImportVariables = this.extractImportVariables(tree, importedFilePaths)
    this.references = this.extractReferences(tree)
    this.exportAliases = this.extractExportAliases(tree)
    this.reExports = this.extractReExports(tree, importedFilePaths)
    this.diffLocations = locateDiffLines(this.rootEncapsulations, diffLines)
  }

  public listRootEncapsulations(): readonly Encapsulation[] {
    return this.rootEncapsulations
  }

  public listFileVariables(): readonly FileVariable[] {
    return this.fileVariables
  }

  public listImportVariables(): readonly ImportVariable[] {
    return this.fileImportVariables
  }

  public listDiffLocations(): readonly DiffLocation[] {
    return this.diffLocations
  }

  public findRootEncapsulation(lines: LineRange): Encapsulation | null {
    return this.rootEncapsulations.find((encapsulation) => containsLines(encapsulation.range, lines)) ?? null
  }

  public findEncapsulation(lines: LineRange): Encapsulation | null {
    return findEncapsulationIn(this.rootEncapsulations, lines, containsLines)
  }

  public traceUsage(target: SymbolTarget): Usage[] {
    const declaration = this.findDeclaration(target)
    if (declaration === null) return []
    return this.references
      .filter((reference) => reference.name === declaration.name && this.resolveReference(reference).includes(declaration))
      .map((reference) => this.usageAt(reference.range))
  }

  public isFileUsingSymbol(symbol: ImportedSymbol): boolean {
    return this.traceImportUsage(symbol).length > 0
  }

  public traceImportUsage(symbol: ImportedSymbol): Usage[] {
    return this.listImportVariablesOf(symbol).flatMap((variable) => this.traceUsage(variable))
  }

  public traceNamedImportUsage({ filePath, name }: ImportedSymbol): Usage[] {
    return this.listImportVariablesOf({ filePath, name })
      .filter((variable) => variable.importedName === name)
      .flatMap((variable) => this.traceUsage(variable))
  }

  public listForwardedNames(symbol: ImportedSymbol): string[] {
    const imported = this.listImportVariablesOf(symbol).flatMap((variable) => this.listAliasesOf(variable.name))
    const reExported = this.reExports
      .filter((reExport) => reExport.importedFilePath === symbol.filePath)
      .flatMap((reExport) => forwardedNamesOf(reExport, symbol.name))
    return [...new Set([...imported, ...reExported])]
  }

  public listEncapsulationPath(encapsulation: Encapsulation): readonly Encapsulation[] {
    return findPathIn(this.rootEncapsulations, encapsulation)
  }

  public findEncapsulationDeclaration(encapsulation: Encapsulation): Declaration | null {
    const declared = this.fileVariables.find(
      (variable) =>
        variable.name === encapsulation.name
        && variable.declarationType !== ARGUMENT
        && containsRange(encapsulation.range, variable.range)
        && containsRange(variable.scope, encapsulation.range),
    )
    return declared ?? null
  }

  public traceEncapsulationUsage(encapsulation: Encapsulation): Usage[] {
    const declaration = this.findEncapsulationDeclaration(this.findTracedEncapsulation(encapsulation))
    return declaration === null ? [] : this.traceUsage(declaration)
  }

  public listExportedNames(encapsulation: Encapsulation): string[] {
    const traced = this.findTracedEncapsulation(encapsulation)
    return this.rootEncapsulations.includes(traced) ? [...new Set([traced.name, ...this.listAliasesOf(traced.name)])] : []
  }

  private findTracedEncapsulation(encapsulation: Encapsulation): Encapsulation {
    const path = this.listEncapsulationPath(encapsulation)
    const declared = [...path].reverse().find((holder) => this.findEncapsulationDeclaration(holder) !== null)
    return declared ?? (path.length > 0 ? path[0] : encapsulation)
  }

  private listAliasesOf(name: string): string[] {
    return this.exportAliases.filter((alias) => alias.name === name).map((alias) => alias.exportedName)
  }

  private listImportVariablesOf({ filePath, name }: ImportedSymbol): ImportVariable[] {
    return this.fileImportVariables
      .filter((variable) => variable.importedFilePath === filePath)
      .filter((variable) => variable.importedName === name || variable.importedName === NAMESPACE_IMPORT)
  }

  private listDeclarationsNamed(name: string): Declaration[] {
    return [...this.fileVariables, ...this.fileImportVariables].filter((declaration) => declaration.name === name)
  }

  private findDeclaration({ name, range }: SymbolTarget): Declaration | null {
    const declared = this.listDeclarationsNamed(name).find((declaration) => isSameRange(declaration.range, range))
    if (declared !== undefined) return declared
    const reference = this.references.find((candidate) => candidate.name === name && isSameRange(candidate.range, range))
    const resolved = this.resolveReference(reference ?? { name, range, spaces: EVERY_SPACE })
    return resolved.length > 0 ? resolved[0] : null
  }

  private resolveReference({ name, range, spaces }: SymbolReference): Declaration[] {
    const visible = this.listDeclarationsNamed(name).filter((declaration) => containsPosition(declaration.scope, range.start))
    const resolved = spaces.flatMap((space) => {
      const inSpace = visible.filter((declaration) => declaration.spaces.includes(space))
      const nearest = narrowest(inSpace, (declaration) => declaration.scope)
      return nearest === null ? [] : inSpace.filter((declaration) => isSameRange(declaration.scope, nearest.scope))
    })
    return [...new Set(resolved)]
  }

  private usageAt(range: SourceRange): Usage {
    return {
      range,
      encapsulation: findEncapsulationIn(this.rootEncapsulations, range, containsRange),
      rootEncapsulation: this.rootEncapsulations.find((encapsulation) => containsRange(encapsulation.range, range)) ?? null,
    }
  }

  protected abstract extractRootEncapsulations(tree: SyntaxTree): readonly Encapsulation[]

  protected abstract extractFileVariables(tree: SyntaxTree): readonly FileVariable[]

  protected abstract extractImportVariables(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ImportVariable[]

  protected abstract extractReferences(tree: SyntaxTree): readonly SymbolReference[]

  protected abstract extractExportAliases(tree: SyntaxTree): readonly ExportAlias[]

  protected abstract extractReExports(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ReExport[]
}
