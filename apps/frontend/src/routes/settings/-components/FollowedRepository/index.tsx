import { useId } from "react"
import Avatar from "@flightplan/ui/Avatar"
import IconButton from "@flightplan/ui/IconButton"
import { LINE_COLOR_CLASSES, type LineColor } from "@flightplan/ui/lib/line-color"
import { cn } from "@flightplan/ui/lib/utils"
import LineRoundel from "@flightplan/ui/LineRoundel"
import StopRing from "@flightplan/ui/StopRing"

interface FollowedAuthor {
  readonly id: string
  readonly name: string
  readonly detail: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

interface FollowedRepositoryProps {
  readonly name: string
  readonly path: string
  readonly lineColor: LineColor
  readonly lineLabel: string
  readonly selfAuthor: FollowedAuthor | null
  readonly trackedAuthors: readonly FollowedAuthor[]
  readonly emptyMessage: string | null
  readonly onConfigure: () => void
}

interface AuthorStopProps {
  readonly author: FollowedAuthor
  readonly isSelf: boolean
}

const RAIL_GRID = "grid grid-cols-[2.5rem_minmax(0,1fr)]"
const SELF_LABEL = "You"

const AuthorStop = ({ author, isSelf }: AuthorStopProps) => (
  <li className={RAIL_GRID}>
    <span aria-hidden="true" className="flex flex-col items-center">
      <span className="h-2 w-1 bg-(--line)" />
      <StopRing status="merged" />
      <span className="w-1 flex-1 bg-(--line)" />
    </span>
    <div className="flex max-w-md items-center gap-2 py-1">
      <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} />
      <span className="min-w-0 truncate">{author.name}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{author.detail}</span>
      {isSelf ? <span className="text-sm font-bold">{SELF_LABEL}</span> : null}
    </div>
  </li>
)

const FollowedRepository = ({
  name,
  path,
  lineColor,
  lineLabel,
  selfAuthor,
  trackedAuthors,
  emptyMessage,
  onConfigure,
}: FollowedRepositoryProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cn("border-t-2 border-foreground pt-5 pb-6", LINE_COLOR_CLASSES[lineColor])}>
      <div className={RAIL_GRID}>
        <span aria-hidden="true" className="flex flex-col items-center">
          <LineRoundel label={lineLabel} />
          <span className="w-1 flex-1 bg-(--line)" />
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2">
          <div className="min-w-0 flex-1 basis-64">
            <h3 id={headingId} className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">{name}</h3>
            <p className="font-mono text-[0.82rem] wrap-anywhere text-muted-foreground">{path}</p>
          </div>
          <IconButton icon="settings" label={`Configure ${name}`} onClick={onConfigure} />
        </div>
      </div>
      <ul aria-label={`Users followed in ${name}`}>
        {selfAuthor === null ? null : <AuthorStop author={selfAuthor} isSelf />}
        {trackedAuthors.map((author) => <AuthorStop key={author.id} author={author} isSelf={false} />)}
      </ul>
      <div className={RAIL_GRID}>
        <span aria-hidden="true" className="flex flex-col items-center">
          <span className="h-4 w-1 bg-(--line)" />
          <span className="h-1 w-4 bg-(--line)" />
        </span>
        {emptyMessage === null ? null : <p className="py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>}
      </div>
    </section>
  )
}

export default FollowedRepository
