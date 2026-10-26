import { SubmitButton } from "@/components/ui/SubmitButton"
import type { Trainer } from "@/db/schema"

interface PokemonFormProps {
  action: (formData: FormData) => Promise<void>
  trainers: Trainer[]
}

export function PokemonForm({ action, trainers }: PokemonFormProps) {
  return (
    <form action={action}>
      <input name="name" placeholder="Name" required />
      <input name="level" type="number" min={1} max={100} required />
      <input name="primaryType" placeholder="Type" required />
      <select name="trainerId">
        <option value="">No trainer</option>
        {trainers.map((trainer) => (
          <option key={trainer.id} value={trainer.id}>
            {trainer.name}
          </option>
        ))}
      </select>
      <SubmitButton label="Save" />
    </form>
  )
}
