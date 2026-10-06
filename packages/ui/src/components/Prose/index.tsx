import CodeLink from "@/components/CodeLink"
import { keyed } from "@/lib/keyed"
import type { CodeLinkTargets, Inline, ProseBlock, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

interface LinkProps {
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

interface InlinesProps extends LinkProps {
  readonly inlines: readonly Inline[]
}

interface ProseProps extends LinkProps {
  readonly blocks: ProseBlocks
  readonly className?: string
}

const HEADING_CLASSES = "pt-5 text-sm font-bold text-muted-foreground first:pt-0"
const LIST_CLASSES = "flex flex-col gap-1 pl-5"
const CODE_CLASSES = "rounded-sm bg-muted px-1 py-px font-mono text-[0.94em]"

const InlineContent = ({ inline, codeLinks, onOpenCodeLink }: LinkProps & { readonly inline: Inline }) => {
  if (inline.kind === "text") return inline.text
  if (inline.kind === "strong") return <strong className="font-bold">{inline.text}</strong>
  if (inline.kind === "code") return <code className={CODE_CLASSES}>{inline.text}</code>
  if (inline.linkId === null || !Object.hasOwn(codeLinks, inline.linkId)) {
    return inline.isCode ? <code className={CODE_CLASSES}>{inline.text}</code> : inline.text
  }
  return <CodeLink target={codeLinks[inline.linkId]} isCode={inline.isCode} onOpen={onOpenCodeLink}>{inline.text}</CodeLink>
}

export const Inlines = ({ inlines, codeLinks, onOpenCodeLink }: InlinesProps) =>
  keyed(inlines).map(({ key, item }) => (
    <InlineContent key={key} inline={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  ))

const Block = ({ block, codeLinks, onOpenCodeLink }: LinkProps & { readonly block: ProseBlock }) => {
  if (block.kind === "heading") {
    return <h3 className={HEADING_CLASSES}><Inlines inlines={block.inlines} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></h3>
  }
  if (block.kind === "paragraph") {
    return <p><Inlines inlines={block.inlines} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></p>
  }
  const items = keyed(block.items).map(({ key, item }) => (
    <li key={key}><Inlines inlines={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></li>
  ))
  return block.isOrdered
    ? <ol className={cn(LIST_CLASSES, "list-decimal")}>{items}</ol>
    : <ul className={cn(LIST_CLASSES, "list-disc")}>{items}</ul>
}

const Prose = ({ blocks, codeLinks, onOpenCodeLink, className }: ProseProps) => (
  <div className={cn("flex max-w-[62ch] flex-col gap-2 text-pretty", className)}>
    {keyed(blocks).map(({ key, item }) => (
      <Block key={key} block={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
    ))}
  </div>
)

export default Prose
