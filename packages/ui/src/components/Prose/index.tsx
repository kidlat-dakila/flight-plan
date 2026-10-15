import { useId, useRef, useState, type KeyboardEvent } from "react"
import CodeLink from "@/components/CodeLink"
import { keyed } from "@/lib/keyed"
import type { CodeLinkTargets, Inline, ProseBlock, ProseBlocks, ProseListItem, ProseSection, ProseTab } from "@/lib/review-content"
import { sectionSummaryOf, type SectionSummary } from "@/lib/section-summary"
import { TAB_CLASSES, TAB_LIST_CLASSES, tabIndexAfterKey } from "@/lib/tab-bar"
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
  <li className={item.blocks.length === 0 ? "" : "space-y-2"}>
    {item.inlines.length === 0
      ? null
      : <span><Inlines inlines={item.inlines} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></span>}
    <Blocks blocks={item.blocks} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  </li>
)

const tabIdOf = (tabsId: string, position: number): string => `${tabsId}-tab-${String(position)}`

const panelIdOf = (tabsId: string, position: number): string => `${tabsId}-panel-${String(position)}`

const Tabs = ({ tabs, codeLinks, onOpenCodeLink }: LinkProps & { readonly tabs: readonly ProseTab[] }) => {
  const tabsId = useId()
  const [openIndex, setOpenIndex] = useState(0)
  const tabButtonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const openTab = tabs.at(openIndex) ?? tabs[0]

  const moveWithKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const nextIndex = tabIndexAfterKey(event.key, openIndex, tabs.length)
    if (nextIndex === null) return
    event.preventDefault()
    setOpenIndex(nextIndex)
    tabButtonsRef.current[nextIndex]?.focus()
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className={TAB_LIST_CLASSES}>
        {keyed(tabs).map(({ key, item }, position) => (
          <button
            key={key}
            ref={(button) => { tabButtonsRef.current[position] = button }}
            type="button"
            role="tab"
            id={tabIdOf(tabsId, position)}
            aria-selected={position === openIndex}
            aria-controls={panelIdOf(tabsId, position)}
            tabIndex={position === openIndex ? 0 : -1}
            className={TAB_CLASSES}
            onClick={() => { setOpenIndex(position) }}
            onKeyDown={moveWithKey}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={panelIdOf(tabsId, openIndex)} aria-labelledby={tabIdOf(tabsId, openIndex)} className="flex flex-col gap-4">
        <Blocks blocks={openTab.blocks} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
      </div>
    </div>
  )
}

const SHOW_DETAILS_LABEL = "See change details"
const HIDE_DETAILS_LABEL = "Hide change details"
const DETAILS_TOGGLE_CLASSES = "cursor-pointer rounded-sm text-sm text-foreground underline decoration-1 underline-offset-[0.3em] hover:text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const SummaryLine = ({ summary }: { readonly summary: SectionSummary }) => (
  <>
    <span className="font-mono text-[0.875em]">{summary.names.join(", ")}</span>
    {summary.moreCount > 0 ? <span>{`+ ${String(summary.moreCount)} more`}</span> : null}
  </>
)

const AccordionSection = ({ section, codeLinks, onOpenCodeLink }: LinkProps & { readonly section: ProseSection }) => {
  const sectionId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const nameId = `${sectionId}-name`
  const panelId = `${sectionId}-panel`
  const summary = sectionSummaryOf(section.blocks)
  const toggle = (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={panelId}
      className={DETAILS_TOGGLE_CLASSES}
      onClick={() => { setIsOpen((wasOpen) => !wasOpen) }}
    >
      {isOpen ? HIDE_DETAILS_LABEL : SHOW_DETAILS_LABEL}
    </button>
  )
  return (
    <section aria-labelledby={nameId} className="flex flex-col gap-2 py-3">
      <h4 id={nameId} className="text-sm font-bold text-foreground">{section.label}</h4>
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
        {!isOpen && summary !== null ? <SummaryLine summary={summary} /> : null}
        {toggle}
      </p>
      {isOpen
        ? (
            <div id={panelId} className="flex flex-col gap-4">
              <Blocks blocks={section.blocks} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
            </div>
          )
        : null}
    </section>
  )
}

const Accordion = ({ sections, codeLinks, onOpenCodeLink }: LinkProps & { readonly sections: readonly ProseSection[] }) => (
  <div className="flex flex-col divide-y divide-border border-y border-border">
    {keyed(sections).map(({ key, item }) => (
      <AccordionSection key={key} section={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
    ))}
  </div>
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
  if (block.kind === "accordion") {
    return <Accordion sections={block.sections} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  }
  if (block.kind === "tabs") {
    return <Tabs tabs={block.tabs} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
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

export const HoverProse = ({ blocks, codeLinks, onOpenCodeLink }: Omit<ProseProps, "className">) => (
  <Prose blocks={blocks} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} className="gap-2 text-sm leading-6" />
)

export default Prose
