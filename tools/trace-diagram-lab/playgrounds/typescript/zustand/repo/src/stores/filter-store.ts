import { create } from "zustand"

interface FilterState {
  hometown: string
  setHometown: (hometown: string) => void
}

export const useFilterStore = create<FilterState>()((set) => ({
  hometown: "",
  setHometown: (hometown) => set({ hometown }),
}))
