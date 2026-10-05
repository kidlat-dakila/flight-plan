import type { SyntaxTree } from "@/ast-graph/parser"
import { containsLines, containsPosition, containsRange, isSameRange } from "@/ast-graph/source-range"
import type {
  Declaration,
  Encapsulation,
  FileVariable,
  ImportedSymbol,
  ImportVariable,
  LineRange,
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
  readonly importedFilePaths: ReadonlyMap<string, string>
}

export const NAMESPACE_IMPORT = "*"

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

export abstract class BaseASTGraphFile {
  public readonly filePath: string
  public readonly gitSha: string
  public readonly importedBy: readonly string[]
  public readonly importsTo: readonly string[]

  private readonly rootEncapsulations: readonly Encapsulation[]
  private readonly fileVariables: readonly FileVariable[]
  private readonly fileImportVariables: readonly ImportVariable[]
  private readonly references: readonly SymbolReference[]

  public constructor({ filePath, gitSha, tree, importedBy, importsTo, importedFilePaths }: ASTGraphFileInput) {
    this.filePath = filePath
    this.gitSha = gitSha
    this.importedBy = importedBy
    this.importsTo = importsTo
    this.rootEncapsulations = this.extractRootEncapsulations(tree)
    this.fileVariables = this.extractFileVariables(tree)
    this.fileImportVariables = this.extractImportVariables(tree, importedFilePaths)
    this.references = this.extractReferences(tree)
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

  public isFileUsingSymbol({ filePath, name }: ImportedSymbol): boolean {
    return this.fileImportVariables
      .filter((variable) => variable.importedFilePath === filePath)
      .filter((variable) => variable.importedName === name || variable.importedName === NAMESPACE_IMPORT)
      .some((variable) => this.traceUsage(variable).length > 0)
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
}
