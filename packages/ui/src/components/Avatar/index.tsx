import { useState } from "react"
import { cn } from "@/lib/utils"

interface AvatarProps {
  readonly imageUrl: string | null
  readonly monogram: string
  readonly className?: string
}

const Avatar = ({ imageUrl, monogram, className }: AvatarProps) => {
  const [hasImageFailed, setHasImageFailed] = useState(false)
  const frameClasses = cn("size-5 shrink-0 rounded-full border border-input bg-card", className)

  return imageUrl === null || hasImageFailed
    ? (
        <span
          aria-hidden="true"
          className={cn(frameClasses, "inline-flex items-center justify-center text-[0.625rem] leading-none font-bold")}
        >
          <span className="text-box-cap">{monogram}</span>
        </span>
      )
    : (
        <img
          src={imageUrl}
          alt=""
          className={cn(frameClasses, "object-cover")}
          onError={() => { setHasImageFailed(true) }}
        />
      )
}

export default Avatar
