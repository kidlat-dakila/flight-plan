const SKELETON_STOPS = ["first", "second", "third", "fourth"] as const
const SKELETON_ROWS = ["w-2/5", "w-3/5", "w-1/2"] as const

const SetupSkeleton = () => (
  <div role="status" aria-busy="true">
    <span className="sr-only">Loading the setup</span>
    <div aria-hidden="true" className="grid gap-x-10 gap-y-8 motion-safe:animate-pulse lg:grid-cols-[17rem_minmax(0,1fr)]">
      <span className="h-9 w-64 rounded-sm bg-muted lg:col-span-2" />
      <div>
        {SKELETON_STOPS.map((stop) => (
          <div key={stop} className="grid min-h-22 grid-cols-[2.5rem_minmax(0,1fr)]">
            <span className="flex flex-col items-center">
              <span className="size-5 rounded-full bg-muted" />
              <span className="w-1 flex-1 bg-muted" />
            </span>
            <span className="h-5 w-32 rounded-sm bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <span className="h-8 w-56 rounded-sm bg-muted" />
        <span className="h-5 w-4/5 rounded-sm bg-muted" />
        {SKELETON_ROWS.map((width) => (
          <span key={width} className={`h-6 rounded-sm bg-muted ${width}`} />
        ))}
      </div>
    </div>
  </div>
)

export default SetupSkeleton
