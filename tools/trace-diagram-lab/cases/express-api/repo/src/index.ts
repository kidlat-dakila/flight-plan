import express from "express"
import { tasksRouter } from "./tasks/routes"

const PORT = 3000

const app = express()

app.use(express.json())
app.use("/tasks", tasksRouter)

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`)
})
