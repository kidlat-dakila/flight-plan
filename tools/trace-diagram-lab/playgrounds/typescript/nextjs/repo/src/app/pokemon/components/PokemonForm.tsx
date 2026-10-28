import { createPokemon } from "@/app/pokemon/actions"
import { SubmitButton } from "@/components/ui/SubmitButton"

export function PokemonForm() {
  return (
    <form action={createPokemon}>
      <input name="name" placeholder="Name" required />
      <input name="level" type="number" min={1} max={100} required />
      <input name="primaryType" placeholder="Type" required />
      <SubmitButton label="Save" />
    </form>
  )
}
