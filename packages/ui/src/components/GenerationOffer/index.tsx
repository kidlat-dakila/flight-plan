import Button from "@/components/blocks/button"

export type GenerationOfferKind = "board" | "notice"

interface GenerationOfferProps {
  readonly kind: GenerationOfferKind
  readonly anchorId: string
  readonly heading: string
  readonly message: string
  readonly generateLabel: string
  readonly generatingLabel: string
  readonly isGenerating: boolean
  readonly errorMessage: string | null
  readonly onGenerate: () => void
}

type OfferBoxProps = Pick<GenerationOfferProps, "message" | "generateLabel" | "generatingLabel" | "isGenerating" | "errorMessage" | "onGenerate">

const OfferBox = ({ message, generateLabel, generatingLabel, isGenerating, errorMessage, onGenerate }: OfferBoxProps) => (
  <div className="flex max-w-[30rem] flex-col items-start gap-3 rounded-md border border-foreground bg-popover p-4 text-popover-foreground">
    <p className="text-sm">{message}</p>
    <Button size="sm" disabled={isGenerating} onClick={onGenerate}>{isGenerating ? generatingLabel : generateLabel}</Button>
    {errorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
  </div>
)

const GenerationOffer = ({ kind, anchorId, heading, ...box }: GenerationOfferProps) =>
  kind === "board"
    ? (
        <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
          <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
          <div className="flex min-h-56 items-center justify-center rounded-md border bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[16px_16px] p-4">
            <OfferBox {...box} />
          </div>
        </section>
      )
    : (
        <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) pb-6">
          <h3 id={`${anchorId}-heading`} className="pb-2 text-base font-bold text-foreground">{heading}</h3>
          <OfferBox {...box} />
        </section>
      )

export default GenerationOffer
