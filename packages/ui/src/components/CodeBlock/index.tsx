import { InnerLine, Pre, type AnnotationHandler, type CodeAnnotation, type HighlightedCode, type Token } from "codehike/code"
import { PlusIcon } from "lucide-react"
import { createContext, use, useMemo, type KeyboardEvent, type ReactNode } from "react"
import HoverCard, { HoverCardContent, HoverCardTrigger } from "@/components/blocks/hover-card"
import OutwardLink from "@/components/OutwardLink"
import type { CodeDeclaration, CodeDefinition, CodeDefinitions, CodeLine, CodeUsages, ProseBlocks, TokenKind } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export interface LineAddress {
  readonly side: "old" | "new"
  readonly lineLabel: string
}

interface CodeBlockProps {
  readonly lines: readonly CodeLine[]
  readonly definitions?: CodeDefinitions
  readonly label: string
  readonly path?: string
  readonly className?: string
  readonly isWrapped?: boolean
  readonly hasReferenceTabStop?: boolean
  readonly addCommentLabel?: string
  readonly selectLineLabel?: string
  readonly selectedLineLabels?: ReadonlySet<string>
  readonly commentedLineKeys?: ReadonlySet<string>
  readonly renderLineExtra?: (numberLabel: string) => ReactNode
  readonly renderLineThreads?: (address: LineAddress) => ReactNode
  readonly renderDefinitionDescription?: (description: ProseBlocks) => ReactNode
  readonly onAddComment?: (address: LineAddress, isExtending: boolean) => void
  readonly onSelectLine?: (numberLabel: string, isExtending: boolean) => void
}

type LineSetting = Pick<
  CodeBlockProps,
  | "lines"
  | "addCommentLabel"
  | "selectLineLabel"
  | "renderLineExtra"
  | "renderLineThreads"
  | "renderDefinitionDescription"
  | "onAddComment"
  | "onSelectLine"
> & {
  readonly selectedLineLabels: ReadonlySet<string>
  readonly commentedLineKeys: ReadonlySet<string>
  readonly definitions: CodeDefinitions
  readonly isWrapped: boolean
  readonly tabStopReferenceKey: string | null
}

const TOKEN_COLORS: Record<TokenKind, string | undefined> = {
  plain: undefined,
  keyword: "var(--color-syntax-keyword)",
  string: "var(--color-syntax-string)",
  number: "var(--color-syntax-number)",
  comment: "var(--color-syntax-quiet)",
  function: "var(--color-syntax-function)",
  type: "var(--color-syntax-type)",
  property: undefined,
  constant: "var(--color-syntax-number)",
  tag: "var(--color-syntax-type)",
  punctuation: undefined,
}

const ROW_CLASSES: Record<CodeLine["mark"], string> = {
  context: "",
  added: "bg-diff-added/12",
  removed: "bg-diff-removed/10",
}

const MARK_SYMBOLS: Record<CodeLine["mark"], string> = {
  context: "",
  added: "+",
  removed: "-",
}

const MARK_CLASSES: Record<CodeLine["mark"], string> = {
  context: "",
  added: "text-diff-added",
  removed: "text-diff-removed",
}

const MARK_NAMES: Record<CodeLine["mark"], string> = {
  context: "",
  added: "added",
  removed: "removed",
}

const LINE_BREAK = "\n"
const LINE_HANDLER_NAME = "line"
const MARK_HANDLER_NAME = "mark"
const DEFINITION_HANDLER_NAME = "definition"
const HOVER_DELAY_MS = 150
const NO_STYLE = {}
const UNFOCUSED_ROW_CLASSES = "group-has-data-[focused=true]/code:opacity-55 data-[focused=true]:opacity-100"
const ADD_COMMENT_CLASSES = "absolute top-0.5 left-1 flex size-4 items-center justify-center rounded-sm bg-(--line) text-line-foreground opacity-0 group-hover/line:opacity-100 focus-visible:opacity-100"
const MARK_CLASSES_INLINE = "rounded-sm bg-[color-mix(in_oklab,var(--line,var(--color-primary))_22%,transparent)] outline outline-1 outline-[var(--line,var(--color-primary))]"
const DEFINITION_DESCRIPTION_CLASSES = "max-h-48 shrink-0 overflow-y-auto border-b px-3 py-2.5 text-foreground [contain:inline-size]"
const REFERENCE_CLASSES = "rounded-sm underline decoration-muted-foreground decoration-dotted underline-offset-[0.25em] hover:bg-muted focus-visible:bg-muted"
const CARD_CLASSES = "flex max-h-[30rem] w-max min-w-[min(20rem,calc(100vw-2rem))] max-w-[min(64rem,calc(100vw-2rem))] flex-col overflow-hidden font-sans whitespace-normal"
const CARD_HEADER_CLASSES = "flex items-baseline justify-between gap-4 border-b px-3 py-2"
const CARD_FOOTER_CLASSES = "flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs [contain:inline-size]"
const REFERENCE_SELECTOR = "[data-reference]"
const CODE_BLOCK_SELECTOR = "[data-code-block]"
const REFERENCE_SCOPE_SELECTOR = "[data-reference-scope]"
const REFERENCE_KEY_SEPARATOR = ":"
const FOCUS_STEP_BY_KEY: ReadonlyMap<string, number> = new Map([["ArrowLeft", -1], ["ArrowRight", 1]])

const SELECTED_ROW_CLASSES = "data-[selected=true]:bg-primary/20"
const COMMENTED_ROW_CLASSES = "data-[commented=true]:shadow-[inset_3px_0_0_var(--line,var(--color-primary))]"
const LINE_NUMBER_CLASSES = "pr-2 text-right text-syntax-quiet tabular-nums select-none"
const LINE_NUMBER_BUTTON_CLASSES = "cursor-pointer hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:font-bold aria-pressed:text-foreground"

const NO_DEFINITIONS: CodeDefinitions = {}
const NO_SELECTED_LINES: ReadonlySet<string> = new Set()
const NO_LINES: LineSetting = {
  lines: [],
  definitions: NO_DEFINITIONS,
  isWrapped: false,
  selectedLineLabels: NO_SELECTED_LINES,
  commentedLineKeys: NO_SELECTED_LINES,
  tabStopReferenceKey: null,
}

const LINE_KEY_SEPARATOR = ":"

export const lineKeyOf = ({ side, lineLabel }: LineAddress): string => `${side}${LINE_KEY_SEPARATOR}${lineLabel}`

export const lineAddressOf = (line: CodeLine): LineAddress | null => {
  if (line.mark === "removed") return line.removedNumberLabel === "" ? null : { side: "old", lineLabel: line.removedNumberLabel }
  return line.numberLabel === "" ? null : { side: "new", lineLabel: line.numberLabel }
}

const LineSettingContext = createContext<LineSetting>(NO_LINES)

const referenceKeyOf = (lineNumber: number, fromColumn: number): string => `${String(lineNumber)}${REFERENCE_KEY_SEPARATOR}${String(fromColumn)}`

const listKnownReferenceKeys = (lines: readonly CodeLine[], definitions: CodeDefinitions): string[] =>
  lines.flatMap((line, index) =>
    line.references
      .filter((reference) => Object.hasOwn(definitions, reference.definitionId))
      .map((reference) => referenceKeyOf(index + 1, reference.fromColumn)))

export const hasKnownReference = (lines: readonly CodeLine[], definitions: CodeDefinitions): boolean =>
  listKnownReferenceKeys(lines, definitions).length > 0

const stepReferenceFocus = (event: KeyboardEvent<HTMLElement>): void => {
  const step = FOCUS_STEP_BY_KEY.get(event.key)
  const scope = event.currentTarget.closest(REFERENCE_SCOPE_SELECTOR) ?? event.currentTarget.closest(CODE_BLOCK_SELECTOR)
  if (step === undefined || scope === null) return
  const references = [...scope.querySelectorAll<HTMLElement>(REFERENCE_SELECTOR)]
  const position = references.indexOf(event.currentTarget) + step
  if (position < 0 || position >= references.length) return
  event.preventDefault()
  references[position].focus()
}

const descriptionOf = (definition: CodeDefinition): string =>
  definition.kind === "usages" ? definition.countLabel : `Defined in ${definition.pathLabel}, ${definition.rangeLabel}`

const toToken = ({ text, kind }: CodeLine["tokens"][number]): Token => [text, TOKEN_COLORS[kind]]

const toTokens = (lines: readonly CodeLine[]): HighlightedCode["tokens"] =>
  lines.flatMap((line, index) => [...line.tokens.map(toToken), ...(index === lines.length - 1 ? [] : [LINE_BREAK])])

const toAnnotations = (lines: readonly CodeLine[]): CodeAnnotation[] =>
  lines.flatMap((line, index) => [
    ...line.marks.map((mark) => ({ name: MARK_HANDLER_NAME, query: "", lineNumber: index + 1, ...mark })),
    ...line.references.map(({ definitionId, ...span }) => ({ name: DEFINITION_HANDLER_NAME, query: definitionId, lineNumber: index + 1, ...span })),
  ])

const toHighlightedCode = (lines: readonly CodeLine[]): HighlightedCode => {
  const text = lines.map((line) => line.tokens.map((token) => token.text).join("")).join(LINE_BREAK)
  return { value: text, code: text, annotations: toAnnotations(lines), tokens: toTokens(lines), lang: "", meta: "", themeName: "", style: NO_STYLE }
}

const LineNumber = ({ numberLabel, isSelected }: { readonly numberLabel: string, readonly isSelected: boolean }) => {
  const { selectLineLabel, onSelectLine } = use(LineSettingContext)
  if (onSelectLine === undefined || selectLineLabel === undefined || numberLabel === "") {
    return <span className={LINE_NUMBER_CLASSES}>{numberLabel}</span>
  }
  return (
    <button
      type="button"
      aria-label={`${selectLineLabel} ${numberLabel}`}
      aria-pressed={isSelected}
      className={cn(LINE_NUMBER_CLASSES, LINE_NUMBER_BUTTON_CLASSES)}
      onClick={(event) => { onSelectLine(numberLabel, event.shiftKey) }}
    >
      {numberLabel}
    </button>
  )
}

const lineHandler: AnnotationHandler = {
  name: LINE_HANDLER_NAME,
  Line: (props) => {
    const {
      lines,
      isWrapped,
      addCommentLabel,
      selectedLineLabels,
      commentedLineKeys,
      renderLineExtra,
      renderLineThreads,
      onAddComment,
    } = use(LineSettingContext)
    const line = lines.find((_line, index) => index === props.lineNumber - 1)
    if (line === undefined) return <InnerLine merge={props} />
    const isSelected = selectedLineLabels.has(line.numberLabel)
    const address = lineAddressOf(line)
    const addressLabel = address === null ? "" : `${MARK_NAMES[line.mark]} ${address.lineLabel}`.trim()
    return (
      <>
        <div
          data-line={line.numberLabel}
          data-mark={line.mark}
          data-focused={line.isFocused}
          data-selected={isSelected}
          data-commented={address !== null && commentedLineKeys.has(lineKeyOf(address))}
          data-comment-side={onAddComment === undefined ? undefined : address?.side}
          data-comment-line={onAddComment === undefined ? undefined : address?.lineLabel}
          className={cn(
            "group/line relative grid min-h-6 grid-cols-[3.25rem_1.25rem_1fr] pr-4",
            ROW_CLASSES[line.mark],
            UNFOCUSED_ROW_CLASSES,
            SELECTED_ROW_CLASSES,
            COMMENTED_ROW_CLASSES,
          )}
        >
          {line.mark === "removed" && line.removedNumberLabel !== ""
            ? <span className={LINE_NUMBER_CLASSES}>{line.removedNumberLabel}</span>
            : <LineNumber numberLabel={line.numberLabel} isSelected={isSelected} />}
          <span className={cn("text-center font-bold select-none", MARK_CLASSES[line.mark])}>
            <span aria-hidden="true">{MARK_SYMBOLS[line.mark]}</span>
            <span className="sr-only">{MARK_NAMES[line.mark]}</span>
          </span>
          <InnerLine merge={props} className={isWrapped ? "wrap-anywhere whitespace-pre-wrap" : "whitespace-pre"} />
          {onAddComment === undefined || addCommentLabel === undefined || address === null
            ? null
            : (
                <button
                  type="button"
                  aria-label={`${addCommentLabel} ${addressLabel}`}
                  title={addCommentLabel}
                  className={ADD_COMMENT_CLASSES}
                  onClick={(event) => { onAddComment(address, event.shiftKey) }}
                >
                  <PlusIcon aria-hidden="true" className="size-3" strokeWidth={3} />
                </button>
              )}
        </div>
        {renderLineExtra === undefined || line.numberLabel === "" ? null : renderLineExtra(line.numberLabel)}
        {renderLineThreads === undefined || address === null ? null : renderLineThreads(address)}
      </>
    )
  },
}

const markHandler: AnnotationHandler = {
  name: MARK_HANDLER_NAME,
  Inline: ({ children }) => <mark className={cn("text-inherit", MARK_CLASSES_INLINE)}>{children}</mark>,
}

const DeclarationCard = ({ declaration }: { readonly declaration: CodeDeclaration }) => {
  const { renderDefinitionDescription } = use(LineSettingContext)
  const label = `${declaration.pathLabel}, ${declaration.rangeLabel}`
  return (
    <>
      <div className={CARD_HEADER_CLASSES}>
        <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{declaration.pathLabel}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{declaration.rangeLabel}</span>
      </div>
      {declaration.description === null || renderDefinitionDescription === undefined
        ? null
        : <div className={DEFINITION_DESCRIPTION_CLASSES}>{renderDefinitionDescription(declaration.description)}</div>}
      {declaration.lines.length === 0 ? null : <CodeBlock lines={declaration.lines} label={label} className="flex-1 overflow-y-auto" />}
      {declaration.note === null && declaration.forgeLink === null
        ? null
        : (
            <div className={CARD_FOOTER_CLASSES}>
              {declaration.note === null ? null : <span className="text-muted-foreground">{declaration.note}</span>}
              {declaration.forgeLink === null ? null : <OutwardLink href={declaration.forgeLink.href} label={declaration.forgeLink.label} />}
            </div>
          )}
    </>
  )
}

const UsagesCard = ({ usages }: { readonly usages: CodeUsages }) => (
  <>
    <div className={CARD_HEADER_CLASSES}>
      <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{usages.nameLabel}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{usages.countLabel}</span>
    </div>
    {usages.files.length === 0
      ? null
      : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {usages.files.map((file) => (
              <section key={file.pathLabel} aria-label={file.pathLabel} className="border-b last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-1.5 text-xs">
                  <span className="min-w-0 font-mono wrap-anywhere">{file.pathLabel}</span>
                  {file.forgeLink === null ? null : <OutwardLink href={file.forgeLink.href} label={file.forgeLink.label} />}
                </div>
                <CodeBlock lines={file.lines} label={`${usages.nameLabel} in ${file.pathLabel}`} />
              </section>
            ))}
          </div>
        )}
    {usages.note === null ? null : <p className="px-3 py-2 text-xs text-muted-foreground [contain:inline-size]">{usages.note}</p>}
  </>
)

const definitionHandler: AnnotationHandler = {
  name: DEFINITION_HANDLER_NAME,
  Inline: ({ annotation, children }) => {
    const { definitions, tabStopReferenceKey } = use(LineSettingContext)
    if (!Object.hasOwn(definitions, annotation.query)) return <>{children}</>
    const definition = definitions[annotation.query]
    const isTabStop = referenceKeyOf(annotation.lineNumber, annotation.fromColumn) === tabStopReferenceKey
    return (
      <HoverCard>
        <HoverCardTrigger
          delay={HOVER_DELAY_MS}
          render={<span />}
          tabIndex={isTabStop ? 0 : -1}
          data-reference=""
          aria-description={descriptionOf(definition)}
          onKeyDown={stepReferenceFocus}
          className={REFERENCE_CLASSES}
        >
          {children}
        </HoverCardTrigger>
        <HoverCardContent className={CARD_CLASSES}>
          {definition.kind === "usages" ? <UsagesCard usages={definition} /> : <DeclarationCard declaration={definition} />}
        </HoverCardContent>
      </HoverCard>
    )
  },
}

const HANDLERS: AnnotationHandler[] = [lineHandler, markHandler, definitionHandler]

function CodeBlock({
  lines,
  definitions = NO_DEFINITIONS,
  label,
  path,
  className,
  isWrapped = false,
  hasReferenceTabStop = true,
  addCommentLabel,
  selectLineLabel,
  selectedLineLabels = NO_SELECTED_LINES,
  commentedLineKeys = NO_SELECTED_LINES,
  renderLineExtra,
  renderLineThreads,
  renderDefinitionDescription,
  onAddComment,
  onSelectLine,
}: CodeBlockProps) {
  const tabStopReferenceKey = useMemo(
    () => (hasReferenceTabStop ? (listKnownReferenceKeys(lines, definitions).at(0) ?? null) : null),
    [hasReferenceTabStop, lines, definitions],
  )
  const lineSetting = useMemo(
    () => ({
      lines,
      definitions,
      tabStopReferenceKey,
      isWrapped,
      addCommentLabel,
      selectLineLabel,
      selectedLineLabels,
      commentedLineKeys,
      renderLineExtra,
      renderLineThreads,
      renderDefinitionDescription,
      onAddComment,
      onSelectLine,
    }),
    [
      lines,
      definitions,
      tabStopReferenceKey,
      isWrapped,
      addCommentLabel,
      selectLineLabel,
      selectedLineLabels,
      commentedLineKeys,
      renderLineExtra,
      renderLineThreads,
      renderDefinitionDescription,
      onAddComment,
      onSelectLine,
    ],
  )
  const code = useMemo(() => toHighlightedCode(lines), [lines])
  return (
    <div
      role="group"
      aria-label={label}
      data-path={path}
      data-code-block=""
      className={cn("group/code overflow-x-auto bg-code py-2 font-mono text-sm leading-6", className)}
    >
      <LineSettingContext value={lineSetting}>
        <Pre code={code} handlers={HANDLERS} className={cn("m-0 grid", isWrapped ? "" : "min-w-max")} />
      </LineSettingContext>
    </div>
  )
}

export default CodeBlock
