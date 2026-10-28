import type { Trainer } from "@/types/trainer"

export function TrainerRow({ trainer }: { trainer: Trainer }) {
  return (
    <tr>
      <td>{trainer.name}</td>
      <td>{trainer.hometown}</td>
    </tr>
  )
}
