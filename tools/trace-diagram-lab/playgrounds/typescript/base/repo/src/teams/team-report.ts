import { formatLevel } from "@/lib/format"
import type { TrainerRoster } from "@/trainers"
import { averageLevel } from "./levels"

export function teamReport(roster: TrainerRoster, trainerId: number): string {
  const trainer = roster.findTrainer(trainerId)
  if (trainer === undefined) return `No trainer has the id ${trainerId}.`
  const team = roster.teamOf(trainerId)
  return `${trainer.name}: ${team.length} Pokemon, average ${formatLevel(averageLevel(team))}`
}
