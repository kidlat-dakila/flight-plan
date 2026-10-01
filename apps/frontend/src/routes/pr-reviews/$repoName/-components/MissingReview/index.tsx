import { buttonVariants } from "@flightplan/ui/blocks/button"

interface MissingReviewProps {
  readonly heading: string
  readonly message: string
  readonly createLink: { readonly href: string, readonly label: string }
  readonly dataNotice: string | null
}

const MissingReview = ({ heading, message, createLink, dataNotice }: MissingReviewProps) => (
  <section className="grid max-w-3xl grid-cols-[2.5rem_minmax(0,1fr)] pt-10">
    <span aria-hidden="true" className="flex flex-col items-center">
      <span className="h-9 w-1 bg-(--line)" />
      <span className="h-1 w-4 bg-(--line)" />
    </span>
    <div className="flex flex-col items-start gap-2 pt-5">
      <h2 className="text-lg leading-7 font-bold">{heading}</h2>
      <p className="max-w-prose text-muted-foreground">{message}</p>
      <a href={createLink.href} className={buttonVariants({ variant: "default", className: "mt-2" })}>
        <span className="text-box-cap">{createLink.label}</span>
      </a>
      {dataNotice === null ? null : <p className="pt-6 text-sm text-muted-foreground">{dataNotice}</p>}
    </div>
  </section>
)

export default MissingReview
