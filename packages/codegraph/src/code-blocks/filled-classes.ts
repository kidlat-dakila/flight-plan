import { groupBy } from "@/shared/group-by"
import { containsRange } from "./source-range"
import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { CardPart, CodeBlockType } from "./types"

interface FilledClass {
  readonly fillerId: string
  readonly classId: string
}

type BlockById = ReadonlyMap<string, StoredCodeBlock>

type SymbolUse = StoredCodeBlockSymbol["use"]

const NEST = "Nest"
const FASTAPI = "FastAPI"
const NEST_COMMON = "@nestjs/common"
const NEST_TYPEORM = "@nestjs/typeorm"
const PYDANTIC = "pydantic"
const CLASS_VALIDATOR = "class-validator"
const CONSTRAINT_DECORATORS: ReadonlySet<string> = new Set(["Validate"])
const NEST_REQUEST_DECORATORS: ReadonlySet<string> = new Set(["Body", "Query", "Param"])
const TYPEORM_INJECTIONS: ReadonlySet<string> = new Set(["InjectRepository"])
const HANDLER: CardPart = "handler"
const CLASS: CodeBlockType = "class"
const PROPERTY: CodeBlockType = "property"
const ARGUMENT: CodeBlockType = "root-argument-value"
const CALL: SymbolUse = "call"
const VALUE: SymbolUse = "value"
const NAMING_A_TYPE: SymbolUse = "type"

const isHandlerOf = (library: string) => (block: StoredCodeBlock): boolean => block.card?.library === library && block.card.part === HANDLER

const targetOf = (symbol: StoredCodeBlockSymbol, blockById: BlockById): StoredCodeBlock | null => {
  const targetId = symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null
  return targetId === null ? null : (blockById.get(targetId) ?? null)
}

const classesNamedBy = (block: StoredCodeBlock, use: SymbolUse, blockById: BlockById): StoredCodeBlock[] =>
  block.outerSymbols.flatMap((symbol) => {
    const target = symbol.use === use ? targetOf(symbol, blockById) : null
    return target?.type === CLASS ? [target] : []
  })

const callsImported = (block: StoredCodeBlock, specifier: string, names: ReadonlySet<string>): boolean =>
  block.outerSymbols.some((symbol) => symbol.type === "unopened-import" && symbol.use === CALL && symbol.specifier === specifier && names.has(symbol.importedName))

const childrenOf = (block: StoredCodeBlock, blockById: BlockById): StoredCodeBlock[] =>
  block.childrenBlockIds.flatMap((childId) => {
    const child = blockById.get(childId)
    return child === undefined ? [] : [child]
  })

const argumentsOf = (block: StoredCodeBlock, blockById: BlockById): StoredCodeBlock[] => childrenOf(block, blockById).filter((child) => child.type === ARGUMENT)

const filledBy = (filler: StoredCodeBlock, classes: readonly StoredCodeBlock[]): FilledClass[] => classes.map((filled) => ({ fillerId: filler.id, classId: filled.id }))

const listNestRequestBodies = (blocks: readonly StoredCodeBlock[], blockById: BlockById): FilledClass[] =>
  blocks.filter(isHandlerOf(NEST)).flatMap((handler) =>
    argumentsOf(handler, blockById)
      .filter((parameter) => callsImported(parameter, NEST_COMMON, NEST_REQUEST_DECORATORS))
      .flatMap((parameter) => filledBy(handler, classesNamedBy(parameter, NAMING_A_TYPE, blockById))))

const listTypeormEntities = (blocks: readonly StoredCodeBlock[], blockById: BlockById): FilledClass[] =>
  blocks
    .filter((parameter) => parameter.type === ARGUMENT && callsImported(parameter, NEST_TYPEORM, TYPEORM_INJECTIONS))
    .flatMap((parameter) => {
      const injecting = parameter.parentBlockId === null ? null : (blockById.get(parameter.parentBlockId) ?? null)
      return injecting === null ? [] : filledBy(injecting, classesNamedBy(parameter, VALUE, blockById))
    })

const listValidatorConstraints = (blocks: readonly StoredCodeBlock[], blockById: BlockById): FilledClass[] =>
  blocks
    .filter((property) => property.type === PROPERTY && callsImported(property, CLASS_VALIDATOR, CONSTRAINT_DECORATORS))
    .flatMap((property) => filledBy(property, classesNamedBy(property, VALUE, blockById)))

const isPydanticModel = (block: StoredCodeBlock, blockById: BlockById, seenIds: ReadonlySet<string> = new Set()): boolean =>
  block.catalogue?.specifier === PYDANTIC
  || classesNamedBy(block, VALUE, blockById).some((base) => !seenIds.has(base.id) && isPydanticModel(base, blockById, new Set([...seenIds, block.id])))

const pydanticModelsNamedBy = (block: StoredCodeBlock, use: SymbolUse, blockById: BlockById): StoredCodeBlock[] =>
  classesNamedBy(block, use, blockById).filter((named) => isPydanticModel(named, blockById))

const isWrittenIn = (block: StoredCodeBlock, parameter: StoredCodeBlock): boolean =>
  block.id !== parameter.id && parameter.lineOfCodeRangeReference.some((range) => block.lineOfCodeRangeReference.some((written) => containsRange(range, written)))

const holdsNoDependency = (parameter: StoredCodeBlock, handler: StoredCodeBlock, blockById: BlockById): boolean =>
  !childrenOf(handler, blockById).some((child) => child.type !== ARGUMENT && isWrittenIn(child, parameter))

const listFastapiModels = (blocks: readonly StoredCodeBlock[], blockById: BlockById): FilledClass[] =>
  blocks.filter(isHandlerOf(FASTAPI)).flatMap((handler) => {
    const bodies = argumentsOf(handler, blockById)
      .filter((parameter) => holdsNoDependency(parameter, handler, blockById))
      .flatMap((parameter) => pydanticModelsNamedBy(parameter, NAMING_A_TYPE, blockById))
    return filledBy(handler, [...bodies, ...pydanticModelsNamedBy(handler, VALUE, blockById)])
  })

export const listFilledClassIds = (codeBlocks: readonly StoredCodeBlock[]): ReadonlyMap<string, readonly string[]> => {
  const blockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  const filled = [...listNestRequestBodies(codeBlocks, blockById), ...listTypeormEntities(codeBlocks, blockById), ...listValidatorConstraints(codeBlocks, blockById), ...listFastapiModels(codeBlocks, blockById)]
  return new Map([...groupBy(filled, (one) => one.fillerId)].map(([fillerId, ofFiller]) => [fillerId, [...new Set(ofFiller.map((one) => one.classId))]] as const))
}
