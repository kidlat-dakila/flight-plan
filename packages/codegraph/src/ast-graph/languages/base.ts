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
      .filter((reference) => reference.name === declaration.name && this.findDeclaration(reference) === declaration)
      .map((reference) => this.usageAt(reference.range))
  }

  public isFileUsingSymbol({ filePath, name }: ImportedSymbol): boolean {
    return this.fileImportVariables
      .filter((variable) => variable.importedFilePath === filePath)
      .filter((variable) => variable.importedName === name || variable.importedName === NAMESPACE_IMPORT)
      .some((variable) => this.traceUsage(variable).length > 0)
  }

  private findDeclaration({ name, range }: SymbolTarget): Declaration | null {
    const named = [...this.fileVariables, ...this.fileImportVariables].filter((declaration) => declaration.name === name)
    const declared = named.find((declaration) => isSameRange(declaration.range, range))
    if (declared !== undefined) return declared
    const visible = named.filter((declaration) => containsPosition(declaration.scope, range.start))
    return narrowest(visible, (declaration) => declaration.scope)
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
