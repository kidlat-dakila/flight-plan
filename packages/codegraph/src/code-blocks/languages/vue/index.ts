import { readVueSyntax } from "@/ast-graph/languages/vue"
import type { ScriptBlock } from "@/ast-graph/languages/vue/sfc"
import type { ParsedTemplate } from "@/ast-graph/languages/vue/template"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import type { FileSyntax } from "@/ast-graph/types"
import { findNothingHanded, type FindExportedBinding, type FindHandedExport } from "@/catalogue/matching/syntax-reader"
import { bindingInScript, exportsOf, outlineTypescriptTree, readScript, type ReadScript } from "@/code-blocks/languages/typescript"
import { readOutline, resolutionOf, type FileOutline } from "@/code-blocks/languages/typescript/outline"
import { blockIdOf } from "@/code-blocks/languages/typescript/syntax"
import type { FileExports, FindExport, OutlinedFile, ReadBlock, ReadUse, ScriptReading } from "@/code-blocks/reading"
import { comparePositions, fromSyntaxRange, rangeOfNode } from "@/code-blocks/source-range"
import type { Position, SourceRange } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import {
  argumentBlocksOf,
  isTemplateEmit,
  listEmittedEvents,
  listEmittedUses,
  readComponentArguments,
  throughArguments,
  withKeysRead,
  type ArgumentKey,
  type ComponentArguments,
  type EmittingTree,
} from "./component-arguments"
import { isReceiverEmit, listOptionEvents, listOptionMembers, listOptionProps, listReceiverUses, withMembersDeclared, type OptionMember } from "./options"
import { componentNameOf, readSingleFile, type SingleFile } from "./sfc"
import { readTemplateBlocks } from "./template-blocks"
import { readTemplateUses, type TemplateReading } from "./template-uses"

export interface VueSource {
  readonly filePath: string
  readonly source: string
  readonly importedFilePaths: ReadonlyMap<string, string>
}

interface OptionsScript {
  readonly grammar: GrammarId
  readonly tree: SyntaxTree
}

interface Options {
  readonly members: readonly OptionMember[]
  readonly props: readonly OptionMember[]
  readonly events: readonly OptionMember[]
  readonly receiverUses: readonly ReadUse[]
  readonly optionsScript: OptionsScript | null
}

interface Component extends Options {
  readonly block: ReadBlock
  readonly script: ReadScript | null
  readonly template: SyntaxNode | null
  readonly parsed: ParsedTemplate | null
}

const DEFAULT_EXPORT = "default"
const COMPONENT_TYPE = "component"
const TEMPLATE_GRAMMAR = "typescript"
const NO_ARGUMENTS: ComponentArguments = { keys: [], propsAt: null, emitAt: null }
const NOTHING_TAKEN: readonly string[] = []

const treeOf = ({ parsed }: SingleFile, block: ScriptBlock): SyntaxTree | null => parsed.scripts.find((script) => script.block === block)?.tree ?? null

const outlineOfScript = (file: SingleFile, block: ScriptBlock, source: VueSource): OutlinedFile | null => {
  const tree = treeOf(file, block)
  return tree === null ? null : outlineTypescriptTree(block.grammar, tree, source)
}

const NO_OPTIONS: Options = { members: [], props: [], events: [], receiverUses: [], optionsScript: null }

const optionsBeside = (file: SingleFile): Options => {
  const { setup, script } = file
  const tree = setup !== null || script === null ? null : treeOf(file, script)
  if (script === null || tree === null) return NO_OPTIONS
  const members = listOptionMembers(script.grammar, tree)
  const props = listOptionProps(script.grammar, tree)
  return {
    members,
    props,
    events: listOptionEvents(script.grammar, tree),
    receiverUses: listReceiverUses(script.grammar, tree, [...members, ...props]),
    optionsScript: { grammar: script.grammar, tree },
  }
}

const keyOfProp = ({ name, range }: OptionMember): ArgumentKey => ({ name, range, declaredAt: [range.start] })

const componentOf = (file: SingleFile, { filePath, importedFilePaths }: VueSource): Component | null => {
  const { setup, template, componentRange } = file
  if (componentRange === null) return null
  const id = blockIdOf(filePath, COMPONENT_TYPE, componentRange, NOTHING_TAKEN)
  const setupTree = setup === null ? null : treeOf(file, setup)
  const outline = setup === null || setupTree === null ? null : readOutline(setup.grammar, setupTree, importedFilePaths)
  return {
    block: { id, name: componentNameOf(filePath), type: COMPONENT_TYPE, ranges: [componentRange], parentId: null, declaredAt: [componentRange.start] },
    script: setup === null || outline === null ? null : { grammar: setup.grammar, filePath, outline, componentId: id },
    template,
    parsed: file.parsed.template,
    ...optionsBeside(file),
  }
}

const exportOfComponent = ({ block }: Component): FileExports["local"][number] => {
  const [{ start }] = block.ranges
  return { exportedName: DEFAULT_EXPORT, declarationRange: { start, end: start }, isFunction: true }
}

const exportsWith = (component: Component | null, script: OutlinedFile | null, setup: FileOutline | null): FileExports => {
  const written = script?.exports ?? { local: [], forwarded: [] }
  if (component === null) return written
  return {
    local: [exportOfComponent(component), ...written.local.filter((exported) => exported.exportedName !== DEFAULT_EXPORT)],
    forwarded: [...written.forwarded, ...(setup === null ? [] : exportsOf(setup).forwarded)],
  }
}

const isBoundAt = (outline: FileOutline, name: SyntaxNode, declaredAt: Position | null): boolean => {
  const resolution = resolutionOf(outline, name)
  return declaredAt !== null && resolution?.kind === "local" && comparePositions(fromSyntaxRange(resolution.declaration.range).start, declaredAt) === 0
}

const handedNowhere: EmittingTree["findHandedPlace"] = () => null

const emittingTreesOf = (script: ReadScript | null, template: TemplateReading | null, optionsScript: OptionsScript | null, { emitAt }: ComponentArguments): EmittingTree[] => [
  ...(optionsScript === null ? [] : [{ ...optionsScript, isEmit: isReceiverEmit, findHandedPlace: handedNowhere }]),
  ...(script === null
    ? []
    : [{ grammar: script.grammar, tree: script.outline.tree, isEmit: (callee: SyntaxNode) => isBoundAt(script.outline, callee, emitAt), findHandedPlace: handedNowhere }]),
  ...(template === null
    ? []
    : [
        {
          grammar: TEMPLATE_GRAMMAR,
          tree: template.outline.tree,
          isEmit: (callee: SyntaxNode) => isTemplateEmit(callee) || isBoundAt(template.outline, callee, emitAt),
          findHandedPlace: template.findHandedPlace,
        } as const,
      ]),
]

const withEventsEmitted = (declared: ComponentArguments, emitting: readonly EmittingTree[]): ComponentArguments => ({
  ...declared,
  keys: firstOfEach([...declared.keys, ...emitting.flatMap(listEmittedEvents)], (key) => key.name),
})

const readComponent = (component: Component, source: VueSource, findExport: FindExport, findBinding: FindExportedBinding, findHanded: FindHandedExport): ScriptReading => {
  const { block, script, template, parsed, members, props, events, optionsScript } = component
  const { filePath } = source
  const body = script === null ? { filePath, blocks: [], uses: [] } : readScript(script, findExport, findBinding, findHanded)
  const declared = script === null ? { ...NO_ARGUMENTS, keys: [...props, ...events].map(keyOfProp) } : readComponentArguments(script.grammar, script.outline.tree)
  const markup = template === null || parsed === null ? null : readTemplateUses({ parsed, template, script: script?.outline ?? null, props: declared.keys, members })
  const emitting = emittingTreesOf(script, markup, optionsScript, declared)
  const written: readonly ReadUse[] = [...body.uses, ...(markup?.uses ?? [])]
  const taken = withKeysRead(withEventsEmitted(declared, emitting), written)
  return {
    filePath,
    blocks: [
      block,
      ...argumentBlocksOf(taken, filePath, block.id),
      ...body.blocks,
      ...(template === null ? [] : readTemplateBlocks(template, filePath, block.id)),
    ],
    uses: [...throughArguments(written, taken), ...emitting.flatMap((tree) => listEmittedUses(tree, taken))],
  }
}

const rangeIsWithin = (range: SourceRange, holder: SourceRange): boolean =>
  comparePositions(holder.start, range.start) <= 0 && comparePositions(range.end, holder.end) <= 0

export const outlineVue = (source: VueSource): OutlinedFile => {
  const file = readSingleFile(source.source)
  const script = file.script === null ? null : outlineOfScript(file, file.script, source)
  const component = componentOf(file, source)
  const setup = component?.script ?? null
  return {
    filePath: source.filePath,
    exports: exportsWith(component, script, setup?.outline ?? null),
    read: (findExport, findBinding, findHanded = findNothingHanded) => {
      const readSyntax = (): FileSyntax => readVueSyntax(file.parsed, source.importedFilePaths)
      const written: ScriptReading = script?.read(findExport, findBinding, findHanded) ?? { filePath: source.filePath, blocks: [], uses: [] }
      if (component === null) return { filePath: source.filePath, blocks: written.blocks, uses: written.uses, readSyntax }
      const read = readComponent(component, source, findExport, findBinding, findHanded)
      return {
        filePath: source.filePath,
        blocks: [...read.blocks, ...withMembersDeclared(written.blocks, component.members)],
        uses: [...read.uses, ...written.uses, ...component.receiverUses],
        readSyntax,
      }
    },
    bindingAt: (declarationRange, findBinding) => {
      const isInSetup = setup !== null && file.setup !== null && rangeIsWithin(declarationRange, rangeOfNode(file.setup.element))
      return isInSetup ? bindingInScript(setup, declarationRange, findBinding) : (script?.bindingAt?.(declarationRange, findBinding) ?? null)
    },
  }
}
