const SKELETON_LINES = [
  { id: "first", stopWidths: ["w-3/5", "w-2/5", "w-1/2"] },
  { id: "second", stopWidths: ["w-2/5", "w-3/5"] },
] as const

const RepositoryIndexSkeleton = () => (
  <div role="status" aria-busy="true">
    <span className="sr-only">Loading your repositories</span>
    <div aria-hidden="true" className="motion-safe:animate-pulse">
      <div className="mb-6 h-9 w-48 rounded-sm bg-muted" />
      {SKELETON_LINES.map((line) => (
        <div key={line.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] border-t-2 border-foreground pt-5 pb-6">
          <span className="flex flex-col items-center">
            <span className="size-7 rounded-full bg-muted" />
            <span className="w-1 flex-1 bg-muted" />
          </span>
          <div className="flex flex-col gap-4 pb-1">
            <span className="h-6 w-40 rounded-sm bg-muted" />
            {line.stopWidths.map((width) => (
              <span key={width} className={`h-5 rounded-sm bg-muted ${width}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

export default RepositoryIndexSkeleton
