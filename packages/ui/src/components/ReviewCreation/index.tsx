import { LoaderCircleIcon } from "lucide-react"
import { useId } from "react"
import Avatar from "@/components/Avatar"
import BaseBranchField, { type BranchSearch } from "@/components/BaseBranchField"
import Button from "@/components/blocks/button"
import type { LabelSegment } from "@/components/LabelSegments"
import ProblemAlert from "@/components/ProblemAlert"
import { cn } from "@/lib/utils"

type FactTone = "plain" | "added" | "removed" | "quiet"

type FactSize = "large" | "small"

interface CreationAuthor {
  readonly name: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

export interface CreationFact {
  readonly label: string
  readonly value: string
  readonly tone: FactTone
  readonly size: FactSize
}

export interface CreationArea {
  readonly name: string
  readonly isPath: boolean
  readonly fileCountLabel: string
  readonly addedLabel: string
  readonly removedLabel: string
  readonly addedShare: number
  readonly removedShare: number
}

export interface ReviewCreationContent {
  readonly heading: string
  readonly author: CreationAuthor | null
  readonly introduction: readonly LabelSegment[]
  readonly baseBranch: {
    readonly branchName: string | null
    readonly noteLabel: string | null
  }
  readonly facts: readonly CreationFact[]
  readonly areas: {
    readonly heading: string
    readonly rows: readonly CreationArea[]
  }
  readonly problem: string | null
  readonly createLabel: string
  readonly creatingLabel: string
}

interface ReviewCreationProps {
  readonly creation: ReviewCreationContent
  readonly branchSearch: BranchSearch
  readonly isCreating: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly onBranchQueryChange: (query: string) => void
  readonly onBaseBranchChange: (branchName: string) => void
  readonly onCreate: () => void
}

interface IntroductionProps {
  readonly author: CreationAuthor | null
  readonly segments: readonly LabelSegment[]
}

interface FactListProps {
  readonly facts: readonly CreationFact[]
}

interface AreaListProps {
  readonly heading: string
  readonly rows: readonly CreationArea[]
}

interface ShareBarProps {
  readonly addedShare: number
  readonly removedShare: number
}

const SEGMENT_CLASSES: Record<LabelSegment["kind"], string> = {
  plain: "",
  code: "rounded-sm bg-muted box-decoration-clone px-1.5 py-0.5 font-mono text-[0.875em] wrap-anywhere",
}

const FACT_TONE_CLASSES: Record<FactTone, string> = {
  plain: "text-foreground",
  added: "text-diff-added",
  removed: "text-diff-removed",
  quiet: "text-muted-foreground",
}

const FACT_SIZE_CLASSES: Record<FactSize, string> = {
  large: "text-xl leading-7 font-bold",
  small: "text-sm leading-5",
}

const PATH_NAME_CLASSES = "min-w-0 font-mono text-[0.94em] wrap-anywhere"

const PLACE_NAME_CLASSES = "min-w-0 text-muted-foreground wrap-anywhere"

const Introduction = ({ author, segments }: IntroductionProps) => (
  <p className="mt-2 flex items-start gap-2">
    {author === null ? null : <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} className="mt-0.5" />}
    <span className="min-w-0">
      {segments.map((segment) => (
        <span key={`${segment.kind}:${segment.text}`} className={SEGMENT_CLASSES[segment.kind]}>{segment.text}</span>
      ))}
    </span>
  </p>
)

const FactList = ({ facts }: FactListProps) => (
  <dl className="grid grid-cols-3 gap-x-4 gap-y-3.5 tabular-nums">
    {facts.map((fact) => (
      <div key={fact.label} className="min-w-0">
        <dt className="text-xs leading-4 text-muted-foreground">{fact.label}</dt>
        <dd className={cn("mt-0.5", FACT_SIZE_CLASSES[fact.size], FACT_TONE_CLASSES[fact.tone])}>{fact.value}</dd>
      </div>
    ))}
  </dl>
)

const ShareBar = ({ addedShare, removedShare }: ShareBarProps) => (
  <span aria-hidden="true" className="flex h-2 gap-0.5">
    <span className="basis-0 bg-diff-added" style={{ flexGrow: addedShare }} />
    <span className="basis-0 bg-diff-removed" style={{ flexGrow: removedShare }} />
  </span>
)

const AreaList = ({ heading, rows }: AreaListProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mt-7">
      <h2 id={headingId} className="mb-2.5 font-bold">{heading}</h2>
      <ul className="grid grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_auto_auto] gap-x-4 text-sm tabular-nums">
        {rows.map((row) => (
          <li key={row.name} className="col-span-4 grid grid-cols-subgrid items-center border-t py-2 last:border-b">
            <span className={row.isPath ? PATH_NAME_CLASSES : PLACE_NAME_CLASSES}>{row.name}</span>
            <ShareBar addedShare={row.addedShare} removedShare={row.removedShare} />
            <span className="text-right text-diff-added">{row.addedLabel}</span>
            <span className="text-right text-diff-removed">{row.removedLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const ReviewCreation = ({
  creation,
  branchSearch,
  isCreating,
  errorMessage,
  onTroubleshoot,
  onBranchQueryChange,
  onBaseBranchChange,
  onCreate,
}: ReviewCreationProps) => (
  <div className="max-w-[52rem] pt-10">
    <h1 className="text-2xl leading-8 font-bold tracking-[-0.015em] text-balance text-(--line)">{creation.heading}</h1>
    <Introduction author={creation.author} segments={creation.introduction} />
    <div className="mt-7 grid grid-cols-2 items-start gap-x-8 border-y py-5">
      <div className="grid min-w-0 gap-1.5">
        <BaseBranchField
          baseBranch={creation.baseBranch.branchName}
          search={branchSearch}
          onQueryChange={onBranchQueryChange}
          onBaseBranchChange={onBaseBranchChange}
        />
        {creation.baseBranch.noteLabel === null
          ? null
          : <p className="text-sm text-muted-foreground">{creation.baseBranch.noteLabel}</p>}
      </div>
      {creation.facts.length === 0 ? null : <FactList facts={creation.facts} />}
    </div>
    {creation.areas.rows.length === 0 ? null : <AreaList heading={creation.areas.heading} rows={creation.areas.rows} />}
    <div className="mt-8 flex flex-col items-start gap-3">
      {creation.problem === null ? null : <ProblemAlert message={creation.problem} onTroubleshoot={null} className="text-destructive" />}
      <Button type="button" disabled={isCreating || creation.problem !== null} aria-busy={isCreating} onClick={onCreate}>
        {isCreating ? <LoaderCircleIcon aria-hidden="true" className="motion-safe:animate-spin" /> : null}
        {isCreating ? creation.creatingLabel : creation.createLabel}
      </Button>
      {errorMessage === null ? null : <ProblemAlert message={errorMessage} onTroubleshoot={onTroubleshoot} className="text-destructive" />}
    </div>
  </div>
)

export default ReviewCreation
