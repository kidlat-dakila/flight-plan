import {
  clipLines,
  containsLines,
  containsPosition,
  containsRange,
  isSameRange,
  linesOf,
  overlapsLines,
} from "@/ast-graph/source-range"
import type {
  Declaration,
  DeclarationType,
  DiffLocation,
  Encapsulation,
  ExportAlias,
  FileSyntax,
  FileVariable,
  ImportedSymbol,
  ImportVariable,
  LineRange,
  ReExport,
  SourceRange,
  Statement,
  SymbolReference,
  SymbolSpace,
  SymbolTarget,
  SyntaxSite,
  Usage,
} from "@/ast-graph/types"

export interface ASTGraphFileInput {
  readonly filePath: string
  readonly diffLines: readonly LineRange[]
  readonly syntax: FileSyntax
}

export const NAMESPACE_IMPORT = "*"
export const DEFAULT_EXPORT = "default"

const ARGUMENT: DeclarationType = "argument"

const EVERY_SPACE: readonly SymbolSpace[] = ["value", "type"]
const VALUE_SPACE: SymbolSpace = "value"

const RUNNING_NOTHING: ReadonlySet<Statement["type"]> = new Set(["import", "type"])
const DECLARING_TYPES: ReadonlySet<Statement["type"]> = new Set(["import", "type", "declaration"])
const FIRST_LINE = 1
const NARROWER_FIRST = -1
const WIDER_LAST = 1

const narrowerFirst = (one: SyntaxSite, two: SyntaxSite): number => {
  if (isSameRange(one.range, two.range)) return 0
  return containsRange(two.range, one.range) ? NARROWER_FIRST : WIDER_LAST
}

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

const sourceNameOf = ({ importedName, exportedName }: ReExport, wantedName: string): string | null => {
  if (importedName !== NAMESPACE_IMPORT) return exportedName === wantedName ? importedName : null
  return exportedName === NAMESPACE_IMPORT && wantedName !== DEFAULT_EXPORT ? wantedName : null
}

const diffLocationIn = (rootEncapsulation: Encapsulation, lines: LineRange): DiffLocation[] => {
  const diffLoC = clipLines(rootEncapsulation.range, lines)
  if (diffLoC === null) return []
  const parentEncapsulation = findEncapsulationIn(rootEncapsulation.encapsulations, diffLoC, containsLines) ?? rootEncapsulation
  return [{ diffLoC, rootEncapsulation, parentEncapsulation }]
}

const locateDiffLines = (rootEncapsulations: readonly Encapsulation[], diffLines: readonly LineRange[]): DiffLocation[] =>
  diffLines.flatMap((lines) => rootEncapsulations.flatMap((rootEncapsulation) => diffLocationIn(rootEncapsulation, lines)))

type StatementHolder = Pick<Statement, "statements" | "arms">

const listHeldStatements = ({ statements, arms }: StatementHolder): Statement[] => [...statements, ...arms.flatMap(listHeldStatements)]

const findNarrowestStatement = (statements: readonly Statement[], range: SourceRange): Statement | null => {
  const holder = statements.find((statement) => containsRange(statement.range, range))
  if (holder === undefined) return null
  return findNarrowestStatement(listHeldStatements(holder), range) ?? holder
}

export class ASTGraphFile {
  public readonly filePath: string

  private readonly rootEncapsulations: readonly Encapsulation[]
  private readonly fileVariables: readonly FileVariable[]
  private readonly fileImportVariables: readonly ImportVariable[]
  private readonly references: readonly SymbolReference[]
  private readonly exportAliases: readonly ExportAlias[]
  private readonly reExports: readonly ReExport[]
  private readonly diffLocations: readonly DiffLocation[]
  private readonly diffLines: readonly LineRange[]
  private readonly syntaxSites: readonly SyntaxSite[]
  private readonly statements: readonly Statement[]
  private readonly sourceLines: readonly string[]

  public constructor({ filePath, diffLines, syntax }: ASTGraphFileInput) {
    this.filePath = filePath
    this.rootEncapsulations = syntax.rootEncapsulations
    this.fileVariables = syntax.fileVariables
    this.fileImportVariables = syntax.importVariables
    this.references = syntax.references
    this.exportAliases = syntax.exportAliases
    this.reExports = syntax.reExports
    this.syntaxSites = syntax.syntaxSites
    this.statements = syntax.statements
    this.diffLines = diffLines
    this.sourceLines = syntax.sourceLines
    this.diffLocations = locateDiffLines(this.rootEncapsulations, diffLines)
  }

  public listDiffLocations(): readonly DiffLocation[] {
    return this.diffLocations
  }

  public readLine(line: number): string {
    return line >= FIRST_LINE && line <= this.sourceLines.length ? this.sourceLines[line - FIRST_LINE] : ""
  }

  public listDiffLines(): readonly LineRange[] {
    return this.diffLines
  }

  public listSyntaxSitesAt(range: SourceRange): SyntaxSite[] {
    return [...this.syntaxSites.filter((site) => containsRange(site.range, range))].sort(narrowerFirst)
  }

  public listSyntaxSitesIn(range: SourceRange): SyntaxSite[] {
    return [...this.syntaxSites.filter((site) => containsRange(range, site.range))].sort((one, two) => narrowerFirst(two, one))
  }

  public listValueReferencesIn(range: SourceRange): SymbolReference[] {
    return this.references.filter((reference) => reference.spaces.includes(VALUE_SPACE) && containsRange(range, reference.range))
  }

  public listReferences(): readonly SymbolReference[] {
    return this.references
  }

  public findDeclarationRange(target: SymbolTarget): SourceRange | null {
    return this.findDeclaration(target)?.range ?? null
  }

  public findDeclarationLines(target: SymbolTarget): LineRange | null {
    const declaration = this.findDeclaration(target)
    return declaration === null ? null : this.declarationLinesOf(declaration)
  }

  public listImportVariables(): readonly ImportVariable[] {
    return this.fileImportVariables
  }

  public findImportVariable(target: SymbolTarget): ImportVariable | null {
    const declaration = this.findDeclaration(target)
    return this.fileImportVariables.find((variable) => variable === declaration) ?? null
  }

  public findExportedLines(exportedName: string): LineRange | null {
    const encapsulation = this.findExportedEncapsulation(exportedName)
    if (encapsulation !== null) return linesOf(encapsulation.range)
    const declared = this.findExportedRootVariable(exportedName)
    return declared === null ? null : this.declarationLinesOf(declared)
  }

  public findExportedDeclaration(exportedName: string): Declaration | null {
    const encapsulation = this.findExportedEncapsulation(exportedName)
    if (encapsulation !== null) return this.findEncapsulationDeclaration(encapsulation)
    return this.findExportedRootVariable(exportedName)
  }

  public listStatements(encapsulation: Encapsulation): readonly Statement[] {
    const own = this.statements.filter((statement) => containsRange(encapsulation.range, statement.range))
    return own.length === 1 ? own[0].statements : own
  }

  public listTopLevelStatements(): readonly Statement[] {
    return this.statements
      .filter((statement) => !RUNNING_NOTHING.has(statement.type))
      .filter((statement) => this.rootEncapsulations.every((encapsulation) => !overlapsLines(encapsulation.range, linesOf(statement.range))))
  }

  public findExternalImportSpecifier(target: SymbolTarget): string | null {
    const declaration = this.findDeclaration(target)
    const imported = this.fileImportVariables.find((variable) => variable === declaration)
    return imported?.importedFilePath === null ? imported.specifier : null
  }

  public findExportedEncapsulation(exportedName: string): Encapsulation | null {
    return this.rootEncapsulations.find((encapsulation) => this.listExportedNamesOf(encapsulation.name).includes(exportedName)) ?? null
  }

  public listReExportedSymbols(exportedName: string): ImportedSymbol[] {
    const forwarded = this.reExports.flatMap((reExport) => {
      const name = sourceNameOf(reExport, exportedName)
      return name === null ? [] : [{ filePath: reExport.importedFilePath, name }]
    })
    const imported = this.fileImportVariables
      .filter((variable) => this.listAliasesOf(variable.name).includes(exportedName))
      .map((variable) => ({ filePath: variable.importedFilePath, name: variable.importedName }))
    return [...forwarded, ...imported].flatMap(({ filePath, name }) => (filePath === null ? [] : [{ filePath, name }]))
  }

  public findRootEncapsulation(lines: LineRange): Encapsulation | null {
    return this.rootEncapsulations.find((encapsulation) => containsLines(encapsulation.range, lines)) ?? null
  }

  public traceUsage(target: SymbolTarget): Usage[] {
    const declaration = this.findDeclaration(target)
    if (declaration === null) return []
    return this.references
      .filter((reference) => reference.name === declaration.name && this.resolveReference(reference).includes(declaration))
      .map((reference) => this.usageAt(reference.range))
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

  public listExportedNamesOf(name: string): string[] {
    return [...new Set([name, ...this.listAliasesOf(name)])]
  }

  private findExportedRootVariable(exportedName: string): FileVariable | null {
    const declared = this.fileVariables.find(
      (variable) =>
        this.listExportedNamesOf(variable.name).includes(exportedName)
        && this.rootEncapsulations.every((root) => !containsRange(root.range, variable.range)),
    )
    return declared ?? null
  }

  private declarationLinesOf(declaration: Declaration): LineRange {
    const root = this.rootEncapsulations.find((encapsulation) => this.findEncapsulationDeclaration(encapsulation) === declaration)
    if (root !== undefined) return linesOf(root.range)
    const isArgument = this.fileVariables.some((variable) => variable === declaration && variable.declarationType === ARGUMENT)
    const statement = isArgument ? null : findNarrowestStatement(this.statements, declaration.range)
    return linesOf(statement !== null && DECLARING_TYPES.has(statement.type) ? statement.range : declaration.range)
  }

  private findTracedEncapsulation(encapsulation: Encapsulation): Encapsulation {
    const path = this.listEncapsulationPath(encapsulation)
    const declared = [...path].reverse().find((holder) => this.findEncapsulationDeclaration(holder) !== null)
    return declared ?? (path.length > 0 ? path[0] : encapsulation)
  }

  private listAliasesOf(name: string): string[] {
    return this.exportAliases.filter((alias) => alias.name === name).map((alias) => alias.exportedName)
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
}
