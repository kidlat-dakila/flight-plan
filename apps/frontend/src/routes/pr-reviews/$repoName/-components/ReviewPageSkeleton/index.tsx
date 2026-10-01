const BAR_CLASSES = "rounded-sm bg-muted motion-safe:animate-pulse"

const ReviewPageSkeleton = () => (
  <div aria-busy="true" aria-label="Opening the review" className="grid grid-cols-[13rem_minmax(0,1fr)] gap-x-8 px-6 pt-4">
    <div className="col-span-2 border-b pb-3"><div className={`h-5 w-64 ${BAR_CLASSES}`} /></div>
    <div className="flex flex-col gap-4 pt-6">
      <div className={`h-5 w-28 ${BAR_CLASSES}`} />
      <div className={`h-5 w-40 ${BAR_CLASSES}`} />
      <div className={`h-5 w-32 ${BAR_CLASSES}`} />
      <div className={`h-5 w-36 ${BAR_CLASSES}`} />
    </div>
    <div className="flex flex-col gap-3 pt-6">
      <div className={`h-6 w-32 ${BAR_CLASSES}`} />
      <div className={`h-5 w-full max-w-[70ch] ${BAR_CLASSES}`} />
      <div className={`h-5 w-full max-w-[64ch] ${BAR_CLASSES}`} />
      <div className={`h-5 w-full max-w-[52ch] ${BAR_CLASSES}`} />
      <div className={`mt-8 h-64 w-full ${BAR_CLASSES}`} />
    </div>
  </div>
)

export default ReviewPageSkeleton
