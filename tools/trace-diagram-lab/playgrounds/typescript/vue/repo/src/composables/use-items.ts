import { onMounted, ref } from "vue"
import { fetchItems } from "@/api/items"
import type { Item } from "@/types/item"

export const useItems = () => {
  const items = ref<Item[]>([])
  const isPending = ref(true)

  onMounted(async () => {
    items.value = await fetchItems()
    isPending.value = false
  })

  return { items, isPending }
}
