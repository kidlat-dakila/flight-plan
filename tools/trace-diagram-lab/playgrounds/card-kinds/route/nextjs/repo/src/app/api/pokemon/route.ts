import { listPokemon } from "@/lib/pokemon"

export function GET() {
  return Response.json(listPokemon())
}
