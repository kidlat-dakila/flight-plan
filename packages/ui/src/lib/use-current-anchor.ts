import { useEffect, useState } from "react"

const READING_LINE_PX = 140

const anchorAtReadingLine = (anchorIds: readonly string[]): string | null =>
  anchorIds.reduce<string | null>((currentAnchorId, anchorId) => {
    const element = document.getElementById(anchorId)
    return element !== null && element.getBoundingClientRect().top <= READING_LINE_PX ? anchorId : currentAnchorId
  }, anchorIds.find((_anchorId, position) => position === 0) ?? null)

export const useCurrentAnchor = (anchorIds: readonly string[]): string | null => {
  const [currentAnchorId, setCurrentAnchorId] = useState<string | null>(null)
  const anchorKey = anchorIds.join("\n")

  useEffect(() => {
    const handleScroll = (): void => {
      setCurrentAnchorId(anchorAtReadingLine(anchorKey === "" ? [] : anchorKey.split("\n")))
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [anchorKey])

  return currentAnchorId
}
