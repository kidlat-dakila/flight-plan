import { PlusIcon } from "lucide-react"
import { Fragment, type ReactNode } from "react"
import { keyed } from "@/lib/keyed"
import type { CodeLine, TokenKind } from "@/lib/review-content"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  readonly lines: readonly CodeLine[]
  readonly label: string
  readonly path?: string
  readonly className?: string
  readonly isWrapped?: boolean
  readonly addCommentLabel?: string
  readonly renderLineExtra?: (numberLabel: string) => ReactNode
  readonly onAddComment?: (numberLabel: string) => void
}

const TOKEN_CLASSES: Record<TokenKind, string> = {
  plain: "",
  keyword: "text-syntax-keyword",
  string: "text-syntax-string",
  number: "text-syntax-number",
  comment: "text-syntax-quiet",
  function: "text-syntax-function",
  type: "text-syntax-type",
  property: "",
  constant: "text-syntax-number",
  tag: "text-syntax-type",
  punctuation: "",
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

const UNFOCUSED_ROW_CLASSES = "group-has-data-[focused=true]/code:opacity-55 data-[focused=true]:opacity-100"
const ADD_COMMENT_CLASSES = "absolute top-0.5 left-1 flex size-4 items-center justify-center rounded-sm bg-(--line) text-line-foreground opacity-0 group-hover/line:opacity-100 focus-visible:opacity-100"

const CodeBlock = ({
  lines,
  label,
  path,
  className,
  isWrapped = false,
  addCommentLabel,
  renderLineExtra,
  onAddComment,
}: CodeBlockProps) => (
  <div
    role="group"
    aria-label={label}
    data-path={path}
    className={cn("group/code overflow-x-auto bg-code py-2 font-mono text-sm leading-6", className)}
  >
    <div className={cn("grid", isWrapped ? "" : "min-w-max")}>
      {keyed(lines).map(({ key, item: line }) => (
        <Fragment key={key}>
          <div
            data-line={line.numberLabel}
            data-mark={line.mark}
            data-focused={line.isFocused}
            className={cn(
              "group/line relative grid grid-cols-[3.25rem_1.25rem_1fr] pr-4",
              ROW_CLASSES[line.mark],
              UNFOCUSED_ROW_CLASSES,
            )}
          >
            <span className="pr-2 text-right text-syntax-quiet tabular-nums select-none">{line.numberLabel}</span>
            <span className={cn("text-center font-bold select-none", MARK_CLASSES[line.mark])}>
              <span aria-hidden="true">{MARK_SYMBOLS[line.mark]}</span>
              <span className="sr-only">{MARK_NAMES[line.mark]}</span>
            </span>
            <span className={isWrapped ? "wrap-anywhere whitespace-pre-wrap" : "whitespace-pre"}>
              {keyed(line.tokens).map(({ key: tokenKey, item: token }) => (
                <span key={tokenKey} className={TOKEN_CLASSES[token.kind]}>{token.text}</span>
              ))}
              {"\n"}
            </span>
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
        </Fragment>
      ))}
    </div>
  </div>
)

export default CodeBlock
