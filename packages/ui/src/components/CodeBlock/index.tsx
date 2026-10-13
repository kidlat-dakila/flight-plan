import { InnerLine, Pre, type AnnotationHandler, type CodeAnnotation, type HighlightedCode, type Token } from "codehike/code"
import { PlusIcon } from "lucide-react"
import { createContext, use, useMemo, type ReactNode } from "react"
import HoverCard, { HoverCardContent, HoverCardTrigger } from "@/components/blocks/hover-card"
import OutwardLink from "@/components/OutwardLink"
import type { CodeDefinitions, CodeLine, TokenKind } from "@/lib/review-content"
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
  readonly addCommentLabel?: string
  readonly selectLineLabel?: string
  readonly selectedLineLabels?: ReadonlySet<string>
  readonly commentedLineKeys?: ReadonlySet<string>
  readonly renderLineExtra?: (numberLabel: string) => ReactNode
  readonly renderLineThreads?: (address: LineAddress) => ReactNode
  readonly onAddComment?: (address: LineAddress, isExtending: boolean) => void
  readonly onSelectLine?: (numberLabel: string, isExtending: boolean) => void
}

type LineSetting = Pick<
  CodeBlockProps,
  "lines" | "addCommentLabel" | "selectLineLabel" | "renderLineExtra" | "renderLineThreads" | "onAddComment" | "onSelectLine"
> & {
  readonly selectedLineLabels: ReadonlySet<string>
  readonly commentedLineKeys: ReadonlySet<string>
  readonly definitions: CodeDefinitions
  readonly isWrapped: boolean
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
const REFERENCE_CLASSES = "rounded-sm underline decoration-muted-foreground decoration-dotted underline-offset-[0.25em] hover:bg-muted focus-visible:bg-muted"

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
}

const LINE_KEY_SEPARATOR = ":"

export const lineKeyOf = ({ side, lineLabel }: LineAddress): string => `${side}${LINE_KEY_SEPARATOR}${lineLabel}`

export const lineAddressOf = (line: CodeLine): LineAddress | null => {
  if (line.mark === "removed") return line.removedNumberLabel === "" ? null : { side: "old", lineLabel: line.removedNumberLabel }
  return line.numberLabel === "" ? null : { side: "new", lineLabel: line.numberLabel }
}

const LineSettingContext = createContext<LineSetting>(NO_LINES)

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

const definitionHandler: AnnotationHandler = {
  name: DEFINITION_HANDLER_NAME,
  Inline: ({ annotation, children }) => {
    const { definitions } = use(LineSettingContext)
    if (!Object.hasOwn(definitions, annotation.query)) return <>{children}</>
    const definition = definitions[annotation.query]
    const label = `${definition.pathLabel}, ${definition.rangeLabel}`
    return (
      <HoverCard>
        <HoverCardTrigger delay={HOVER_DELAY_MS} render={<span />} tabIndex={0} aria-label={`Defined in ${label}`} className={REFERENCE_CLASSES}>
          {children}
        </HoverCardTrigger>
        <HoverCardContent className="flex max-h-[22.5rem] w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden font-sans whitespace-normal">
          <div className="flex items-baseline justify-between gap-4 border-b px-3 py-2">
            <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{definition.pathLabel}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{definition.rangeLabel}</span>
          </div>
          <CodeBlock lines={definition.lines} label={label} className="min-h-0 flex-1 overflow-y-auto" />
          {definition.note === null && definition.forgeLink === null
            ? null
            : (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs">
                  {definition.note === null ? null : <span className="text-muted-foreground">{definition.note}</span>}
                  {definition.forgeLink === null ? null : <OutwardLink href={definition.forgeLink.href} label={definition.forgeLink.label} />}
                </div>
              )}
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
  addCommentLabel,
  selectLineLabel,
  selectedLineLabels = NO_SELECTED_LINES,
  commentedLineKeys = NO_SELECTED_LINES,
  renderLineExtra,
  renderLineThreads,
  onAddComment,
  onSelectLine,
}: CodeBlockProps) {
  const lineSetting = useMemo(
    () => ({
      lines,
      definitions,
      isWrapped,
      addCommentLabel,
      selectLineLabel,
      selectedLineLabels,
      commentedLineKeys,
      renderLineExtra,
      renderLineThreads,
      onAddComment,
      onSelectLine,
    }),
    [
      lines,
      definitions,
      isWrapped,
      addCommentLabel,
      selectLineLabel,
      selectedLineLabels,
      commentedLineKeys,
      renderLineExtra,
      renderLineThreads,
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
      className={cn("group/code overflow-x-auto bg-code py-2 font-mono text-sm leading-6", className)}
    >
      <LineSettingContext value={lineSetting}>
        <Pre code={code} handlers={HANDLERS} className={cn("m-0 grid", isWrapped ? "" : "min-w-max")} />
      </LineSettingContext>
    </div>
  )
}

export default CodeBlock
