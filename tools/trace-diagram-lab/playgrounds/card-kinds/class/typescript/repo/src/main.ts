import { TrainerRoster } from "@/trainers/roster"

const roster = new TrainerRoster()

console.log(roster.findTrainer(1)?.name)
