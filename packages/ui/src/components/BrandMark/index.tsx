interface BrandMarkProps {
  readonly logoSrc: string
  readonly name: string
}

const BrandMark = ({ logoSrc, name }: BrandMarkProps) => (
  <span className="inline-flex items-center gap-2.5">
    <img src={logoSrc} alt="" width="32" height="32" className="size-8" />
    <span className="text-box-cap text-[1.0625rem] leading-none font-bold tracking-[-0.01em]">{name}</span>
  </span>
)

export default BrandMark
