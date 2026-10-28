import { createBrowserRouter } from "react-router"
import { ItemsPage } from "@/routes/items"
import { itemsLoader } from "@/routes/items/loader"
import { RootLayout } from "@/routes/root-layout"
import { TrainersPage } from "@/routes/trainers"
import { trainersLoader } from "@/routes/trainers/loader"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <TrainersPage />, loader: trainersLoader },
      { path: "items", element: <ItemsPage />, loader: itemsLoader },
    ],
  },
])
