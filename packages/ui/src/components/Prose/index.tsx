import CodeLink from "@/components/CodeLink"
import { keyed } from "@/lib/keyed"
import type { CodeLinkTargets, Inline, ProseBlock, ProseBlocks, ProseListItem } from "@/lib/review-content"
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

const HEADING_CLASSES = "pt-4 text-[1.1875rem] leading-7 font-semibold tracking-[-0.01em] text-foreground first:pt-0"
const LIST_CLASSES = "flex flex-col gap-2 pl-5"
const CODE_CLASSES = "rounded-sm bg-muted box-decoration-clone px-1.5 py-0.5 font-mono text-[0.875em]"
const LINK_CLASSES = "rounded-sm underline decoration-1 underline-offset-[0.3em] hover:text-primary-text"
const QUOTE_CLASSES = "flex flex-col gap-4 border-l-2 border-border pl-4 text-muted-foreground"
const CODE_BLOCK_CLASSES = "overflow-x-auto rounded-md bg-code px-4 py-3 font-mono text-sm leading-6"

const InlineContent = ({ inline, codeLinks, onOpenCodeLink }: LinkProps & { readonly inline: Inline }) => {
  if (inline.kind === "text") return inline.text
  if (inline.kind === "strong") return <strong className="font-bold">{inline.text}</strong>
  if (inline.kind === "emphasis") return <em>{inline.text}</em>
  if (inline.kind === "code") return <code className={CODE_CLASSES}>{inline.text}</code>
  if (inline.kind === "link") return <a href={inline.href} target="_blank" rel="noreferrer" className={LINK_CLASSES}>{inline.text}</a>
  if (inline.linkId === null || !Object.hasOwn(codeLinks, inline.linkId)) {
    return inline.isCode ? <code className={CODE_CLASSES}>{inline.text}</code> : inline.text
  }
  return <CodeLink target={codeLinks[inline.linkId]} isCode={inline.isCode} onOpen={onOpenCodeLink}>{inline.text}</CodeLink>
}

export const Inlines = ({ inlines, codeLinks, onOpenCodeLink }: InlinesProps) =>
  keyed(inlines).map(({ key, item }) => (
    <InlineContent key={key} inline={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  ))

const Blocks = ({ blocks, codeLinks, onOpenCodeLink }: LinkProps & { readonly blocks: ProseBlocks }) =>
  keyed(blocks).map(({ key, item }) => (
    <Block key={key} block={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  ))

const ListItem = ({ item, codeLinks, onOpenCodeLink }: LinkProps & { readonly item: ProseListItem }) => (
  <li className={item.blocks.length === 0 ? "" : "flex flex-col gap-2"}>
    {item.inlines.length === 0
      ? null
      : <span><Inlines inlines={item.inlines} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></span>}
    <Blocks blocks={item.blocks} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  </li>
)

function Block({ block, codeLinks, onOpenCodeLink }: LinkProps & { readonly block: ProseBlock }) {
  if (block.kind === "heading") {
    return <h3 className={HEADING_CLASSES}><Inlines inlines={block.inlines} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></h3>
  }
  if (block.kind === "paragraph") {
    return <p><Inlines inlines={block.inlines} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></p>
  }
  if (block.kind === "quote") {
    return (
      <blockquote className={QUOTE_CLASSES}>
        <Blocks blocks={block.blocks} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
      </blockquote>
    )
  }
  if (block.kind === "code-block") {
    return <pre data-language={block.language ?? undefined} className={CODE_BLOCK_CLASSES}><code>{block.text}</code></pre>
  }
  const items = keyed(block.items).map(({ key, item }) => (
    <ListItem key={key} item={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  ))
  return block.isOrdered
    ? <ol className={cn(LIST_CLASSES, "list-decimal")}>{items}</ol>
    : <ul className={cn(LIST_CLASSES, "list-disc")}>{items}</ul>
}

const Prose = ({ blocks, codeLinks, onOpenCodeLink, className }: ProseProps) => (
  <div className={cn("flex max-w-[68ch] flex-col gap-4 text-base leading-[1.7] text-pretty", className)}>
    <Blocks blocks={blocks} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  </div>
)

export default Prose
