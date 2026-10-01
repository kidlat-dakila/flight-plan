import { useEffect, useState } from "react"

export const useScrolledPast = (thresholdPx: number): boolean => {
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const handleScroll = (): void => {
      setIsPast(window.scrollY > thresholdPx)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [thresholdPx])

  return isPast
}
