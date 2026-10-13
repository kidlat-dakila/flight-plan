const SKELETON_ROWS = ["w-2/5", "w-3/5", "w-1/2"] as const

const SettingsSkeleton = () => (
  <div role="status" aria-busy="true">
    <span className="sr-only">Loading the settings</span>
    <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
      <span className="h-8 w-56 rounded-sm bg-muted" />
      <span className="h-5 w-4/5 rounded-sm bg-muted" />
      {SKELETON_ROWS.map((width) => (
        <span key={width} className={`h-6 rounded-sm bg-muted ${width}`} />
      ))}
    </div>
  </div>
)

export default SettingsSkeleton
