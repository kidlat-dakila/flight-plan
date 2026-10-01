interface BrandMarkProps {
  readonly logoSrc: string
  readonly name: string
}

const BrandMark = ({ logoSrc, name }: BrandMarkProps) => (
  <img src={logoSrc} alt={name} width="32" height="32" className="size-8" />
)

export default BrandMark
