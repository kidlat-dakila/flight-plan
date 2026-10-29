import { renameTrainer } from "@/trainers/rename"

const renamed = renameTrainer(1, "Red")

console.log(`Trainer ${renamed.id} is now ${renamed.name}`)
