import { InnerLine, Pre, type AnnotationHandler, type CodeAnnotation, type HighlightedCode, type Token } from "codehike/code"
import { PlusIcon } from "lucide-react"
import { createContext, use, useMemo, type ReactNode } from "react"
import HoverCard, { HoverCardContent, HoverCardTrigger } from "@/components/blocks/hover-card"
import OutwardLink from "@/components/OutwardLink"
import type { CodeDefinitions, CodeLine, TokenKind } from "@/lib/review-content"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  readonly lines: readonly CodeLine[]
  readonly definitions?: CodeDefinitions
  readonly label: string
  readonly path?: string
  readonly className?: string
  readonly isWrapped?: boolean
  readonly addCommentLabel?: string
  readonly renderLineExtra?: (numberLabel: string) => ReactNode
  readonly onAddComment?: (numberLabel: string) => void
}

type LineSetting = Pick<CodeBlockProps, "lines" | "addCommentLabel" | "renderLineExtra" | "onAddComment"> & {
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

const NO_DEFINITIONS: CodeDefinitions = {}
const NO_LINES: LineSetting = { lines: [], definitions: NO_DEFINITIONS, isWrapped: false }

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

const lineHandler: AnnotationHandler = {
  name: LINE_HANDLER_NAME,
  Line: (props) => {
    const { lines, isWrapped, addCommentLabel, renderLineExtra, onAddComment } = use(LineSettingContext)
    const line = lines.find((_line, index) => index === props.lineNumber - 1)
    if (line === undefined) return <InnerLine merge={props} />
    return (
      <>
        <div
          data-line={line.numberLabel}
          data-mark={line.mark}
          data-focused={line.isFocused}
          className={cn("group/line relative grid min-h-6 grid-cols-[3.25rem_1.25rem_1fr] pr-4", ROW_CLASSES[line.mark], UNFOCUSED_ROW_CLASSES)}
        >
          <span className="pr-2 text-right text-syntax-quiet tabular-nums select-none">{line.numberLabel}</span>
          <span className={cn("text-center font-bold select-none", MARK_CLASSES[line.mark])}>
            <span aria-hidden="true">{MARK_SYMBOLS[line.mark]}</span>
            <span className="sr-only">{MARK_NAMES[line.mark]}</span>
          </span>
          <InnerLine merge={props} className={isWrapped ? "wrap-anywhere whitespace-pre-wrap" : "whitespace-pre"} />
          {onAddComment === undefined || addCommentLabel === undefined || line.numberLabel === ""
            ? null
            : (
                <button
                  type="button"
                  aria-label={`${addCommentLabel} ${line.numberLabel}`}
                  title={addCommentLabel}
                  className={ADD_COMMENT_CLASSES}
                  onClick={() => { onAddComment(line.numberLabel) }}
                >
                  <PlusIcon aria-hidden="true" className="size-3" strokeWidth={3} />
                </button>
              )}
        </div>
        {renderLineExtra === undefined || line.numberLabel === "" ? null : renderLineExtra(line.numberLabel)}
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
  renderLineExtra,
  onAddComment,
}: CodeBlockProps) {
  const lineSetting = useMemo(
    () => ({ lines, definitions, isWrapped, addCommentLabel, renderLineExtra, onAddComment }),
    [lines, definitions, isWrapped, addCommentLabel, renderLineExtra, onAddComment],
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
