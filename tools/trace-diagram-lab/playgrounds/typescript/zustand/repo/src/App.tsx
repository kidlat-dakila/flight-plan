import { Header } from "@/components/Header"
import { ItemsPage } from "@/pages/items/ItemsPage"
import { TrainersPage } from "@/pages/trainers/TrainersPage"

export function App() {
  return (
    <div>
      <Header />
      <main>
        <TrainersPage />
        <ItemsPage />
      </main>
    </div>
  )
}
