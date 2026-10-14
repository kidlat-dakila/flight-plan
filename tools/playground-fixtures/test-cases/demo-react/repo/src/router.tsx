import { createBrowserRouter } from "react-router"
import { CustomersPage } from "@/routes/customers"
import { HelpPage } from "@/routes/help"
import { ProductsPage } from "@/routes/products"
import { RootLayout } from "@/routes/root-layout"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <CustomersPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "help", element: <HelpPage /> },
    ],
  },
])
