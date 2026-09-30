import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import { useTRPC } from "@/trpc"

const GREETING_NAMES = ["Flight Plan", "Fastify", "tRPC"] as const

const nextNameIndex = (index: number): number => (index + 1) % GREETING_NAMES.length

const HomePage = () => {
  const trpc = useTRPC()
  const [nameIndex, setNameIndex] = useState(0)
  const name = GREETING_NAMES[nameIndex] ?? GREETING_NAMES[0]
  const greeting = useQuery(trpc.greeting.queryOptions({ name }))

  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">{greeting.data ?? "Loading…"}</h1>
      <Button onClick={() => { setNameIndex(nextNameIndex) }}>Greet someone else</Button>
    </section>
  )
}

export const Route = createFileRoute("/")({ component: HomePage })
