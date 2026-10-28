import type { Pokemon } from "@/trainers"

export function averageLevel(team: Pokemon[]): number {
  if (team.length === 0) return 0
  const total = team.reduce((sum, pokemon) => sum + pokemon.level, 0)
  return Math.round(total / team.length)
}
