import { createBrowserRouter } from "react-router"
import { AccountPage } from "@/routes/account"
import { CartPage } from "@/routes/cart"
import { CatalogPage } from "@/routes/catalog"
import { RootLayout } from "@/routes/root-layout"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "account", element: <AccountPage /> },
    ],
  },
])
