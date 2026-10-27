"use client"

import type { Trainer } from "@prisma/client"
import { useRouter } from "next/navigation"
import { SubmitButton } from "~/app/_components/SubmitButton"
import { api } from "~/trpc/react"

const NO_TRAINER = ""

export function PokemonForm({ trainers }: { trainers: Trainer[] }) {
  const router = useRouter()
  const create = api.pokemon.create.useMutation({
    onSuccess: (created) => router.push(`/pokemon/${created.id}`),
  })

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => {
        const trainerId = String(formData.get("trainerId"))
        create.mutate({
          name: String(formData.get("name")),
          level: Number(formData.get("level")),
          primaryType: String(formData.get("primaryType")),
          trainerId: trainerId === NO_TRAINER ? null : Number(trainerId),
        })
      }}
    >
      <input name="name" placeholder="Name" required className="rounded bg-slate-800 px-3 py-2" />
      <input name="level" type="number" min={1} max={100} required className="rounded bg-slate-800 px-3 py-2" />
      <input name="primaryType" placeholder="Type" required className="rounded bg-slate-800 px-3 py-2" />
      <select name="trainerId" className="rounded bg-slate-800 px-3 py-2">
        <option value={NO_TRAINER}>No trainer</option>
        {trainers.map((trainer) => (
          <option key={trainer.id} value={trainer.id}>
            {trainer.name}
          </option>
        ))}
      </select>
      <SubmitButton label="Save" isPending={create.isPending} />
    </form>
  )
}
