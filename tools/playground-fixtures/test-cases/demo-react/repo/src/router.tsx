import { createBrowserRouter } from "react-router"
import { HelpPage } from "@/routes/help"
import { ItemsPage } from "@/routes/items"
import { RootLayout } from "@/routes/root-layout"
import { TrainersPage } from "@/routes/trainers"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <TrainersPage /> },
      { path: "items", element: <ItemsPage /> },
      { path: "help", element: <HelpPage /> },
    ],
  },
])
