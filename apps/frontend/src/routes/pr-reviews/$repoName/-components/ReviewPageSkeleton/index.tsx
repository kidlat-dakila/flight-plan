const BAR_CLASSES = "rounded-sm bg-muted motion-safe:animate-pulse"

const ReviewPageSkeleton = () => (
  <div aria-busy="true" aria-label="Opening the review" className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-[18.5rem_minmax(0,1fr)_14rem_3rem]">
    <div className="flex flex-col gap-3 border-r px-4 pt-4">
      <div className={`h-5 w-32 ${BAR_CLASSES}`} />
      <div className={`h-4 w-40 ${BAR_CLASSES}`} />
      <div className={`h-4 w-36 ${BAR_CLASSES}`} />
      <div className={`h-4 w-28 ${BAR_CLASSES}`} />
    </div>
    <div className="flex flex-col gap-3 px-6 pt-4">
      <div className="border-b pb-3"><div className={`h-5 w-64 ${BAR_CLASSES}`} /></div>
      <div className={`mt-3 h-6 w-32 ${BAR_CLASSES}`} />
      <div className={`h-5 w-full max-w-[70ch] ${BAR_CLASSES}`} />
      <div className={`h-5 w-full max-w-[64ch] ${BAR_CLASSES}`} />
      <div className={`h-5 w-full max-w-[52ch] ${BAR_CLASSES}`} />
      <div className={`mt-8 h-64 w-full ${BAR_CLASSES}`} />
    </div>
    <div className="flex flex-col gap-4 border-l px-4 pt-4">
      <div className={`h-5 w-24 ${BAR_CLASSES}`} />
      <div className={`h-5 w-28 ${BAR_CLASSES}`} />
      <div className={`h-5 w-32 ${BAR_CLASSES}`} />
    </div>
    <div className="border-l" />
  </div>
)

export default ReviewPageSkeleton
