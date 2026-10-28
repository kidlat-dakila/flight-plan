import { onMounted, ref } from "vue"
import { fetchTrainers } from "@/api/trainers"
import type { Trainer } from "@/types/trainer"

export const useTrainers = () => {
  const trainers = ref<Trainer[]>([])
  const isPending = ref(true)

  onMounted(async () => {
    trainers.value = await fetchTrainers()
    isPending.value = false
  })

  return { trainers, isPending }
}
