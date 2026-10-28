import { MAX_LEVEL } from "@/config"

export function formatLevel(level: number): string {
  return `Lv. ${level}/${MAX_LEVEL}`
}
