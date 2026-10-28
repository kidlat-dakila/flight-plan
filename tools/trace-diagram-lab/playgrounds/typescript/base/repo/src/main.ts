import { priceOf } from "@/items/prices"
import { teamReport } from "@/teams/team-report"
import { TrainerRoster, type Trainer } from "@/trainers"

const TRAINERS: Trainer[] = [
  { id: 1, name: "Ash", hometown: "Pallet Town", team: [{ name: "Pikachu", level: 25 }, { name: "Charizard", level: 36 }] },
  { id: 2, name: "Misty", hometown: "Cerulean City", team: [{ name: "Starmie", level: 30 }] },
]

const roster = new TrainerRoster(TRAINERS)

console.log(teamReport(roster, 1))
console.log(priceOf("potion"))
