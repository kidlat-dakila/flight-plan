import type { ComponentProps } from "react"
import { useCurrentAnchorId, type ReadingPositionStore } from "@/routes/pr-reviews/$repoName/-hooks/use-reading-position"
import FileExplorer from "@flightplan/ui/FileExplorer"

interface ReadingFileExplorerProps extends Omit<ComponentProps<typeof FileExplorer>, "currentAnchorId"> {
  readonly readingPosition: ReadingPositionStore
}

const ReadingFileExplorer = ({ readingPosition, ...explorer }: ReadingFileExplorerProps) => (
  <FileExplorer {...explorer} currentAnchorId={useCurrentAnchorId(readingPosition)} />
)

export default ReadingFileExplorer
