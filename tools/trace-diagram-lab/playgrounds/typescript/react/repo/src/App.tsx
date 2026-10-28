import { useState } from "react"
import { Button } from "@/components/ui"
import { ItemsPage } from "@/pages/items/ItemsPage"
import { TrainersPage } from "@/pages/trainers/TrainersPage"

type Tab = "trainers" | "items"

export function App() {
  const [tab, setTab] = useState<Tab>("trainers")
  return (
    <div>
      <header>
        <Button variant="ghost" onClick={() => setTab("trainers")}>
          Trainers
        </Button>
        <Button variant="ghost" onClick={() => setTab("items")}>
          Items
        </Button>
      </header>
      <main>{tab === "trainers" ? <TrainersPage /> : <ItemsPage />}</main>
    </div>
  )
}
