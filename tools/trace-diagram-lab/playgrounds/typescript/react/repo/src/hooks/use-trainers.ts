import { useEffect, useState } from "react"
import { fetchTrainers } from "@/api/trainers"
import type { Trainer } from "@/types/trainer"

export function useTrainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTrainers()
      .then(setTrainers)
      .finally(() => setIsLoading(false))
  }, [])

  return { trainers, isLoading }
}
