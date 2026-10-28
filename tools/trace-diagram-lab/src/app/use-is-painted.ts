import { useEffect, useState } from "react"

export const useIsPainted = (): boolean => {
  const [isPainted, setIsPainted] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsPainted(true)
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])
  return isPainted
}
