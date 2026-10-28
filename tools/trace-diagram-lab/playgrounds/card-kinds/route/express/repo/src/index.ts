import express from "express"
import { pokemonRouter } from "@/pokemon/routes"
import { trainersRouter } from "@/trainers/routes"

const PORT = 3000

const app = express()

app.use(express.json())
app.use("/api", trainersRouter)
app.use("/api", pokemonRouter)

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`)
})
