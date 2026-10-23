import { FileIcon as PlainFileIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileChangeKind, FileIconKind } from "./kinds"
import { PATH_ICONS } from "./path-icons"
import pictureIcons from "./picture-icons"

export type { FileChangeKind, FileIconKind } from "./kinds"

interface FileChange {
  readonly kind: FileChangeKind
  readonly label: string
}

interface FileIconProps {
  readonly kind: FileIconKind
  readonly change: FileChange | null
  readonly className?: string
}

const BADGE_FILLS: Readonly<Record<FileChangeKind, string>> = {
  added: "fill-diff-added",
  modified: "fill-line-blue",
  deleted: "fill-diff-removed",
}

const BADGE_GLYPHS: Readonly<Record<FileChangeKind, string | null>> = {
  added: "M8 4.75v6.5M4.75 8h6.5",
  modified: null,
  deleted: "M4.75 8h6.5",
}

const LanguageIcon = ({ kind }: { readonly kind: FileIconKind }) => {
  const picture = pictureIcons[kind]
  if (picture !== undefined) return <img src={picture} alt="" aria-hidden="true" className="size-full" />
  const pathIcon = PATH_ICONS[kind]
  if (pathIcon === undefined) return <PlainFileIcon aria-hidden="true" className="size-full text-muted-foreground" />
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-full", pathIcon.color === null && "text-muted-foreground")}>
      <path d={pathIcon.path} fill={pathIcon.color ?? "currentColor"} />
    </svg>
  )
}

const ChangeBadge = ({ change }: { readonly change: FileChange }) => {
  const glyph = BADGE_GLYPHS[change.kind]
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" data-change={change.kind} className="absolute -right-1 -bottom-[3px] size-[0.5625rem]">
      <circle cx="8" cy="8" r="7.2" className={cn(BADGE_FILLS[change.kind], "stroke-background [stroke-width:1.6]")} />
      {glyph === null ? null : <path d={glyph} className="stroke-background [stroke-width:2]" />}
    </svg>
  )
}

const FileIcon = ({ kind, change, className }: FileIconProps) => (
  <span data-file-icon={kind} className={cn("relative inline-flex size-[0.9375rem] shrink-0", className)}>
    <LanguageIcon kind={kind} />
    {change === null ? null : <ChangeBadge change={change} />}
  </span>
)

export default FileIcon
