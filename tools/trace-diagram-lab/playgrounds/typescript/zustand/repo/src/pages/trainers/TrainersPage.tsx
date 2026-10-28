import { TRAINERS } from "@/data/trainers"
import { useFilterStore } from "@/stores/filter-store"
import { TrainerRow } from "./components/TrainerRow"

export function TrainersPage() {
  const hometown = useFilterStore((state) => state.hometown)
  const setHometown = useFilterStore((state) => state.setHometown)
  const trainers = TRAINERS.filter((trainer) => hometown === "" || trainer.hometown === hometown)
  return (
    <section>
      <input value={hometown} placeholder="Hometown" onChange={(event) => setHometown(event.target.value)} />
      <table>
        <tbody>
          {trainers.map((trainer) => (
            <TrainerRow key={trainer.id} trainer={trainer} />
          ))}
        </tbody>
      </table>
    </section>
  )
}
