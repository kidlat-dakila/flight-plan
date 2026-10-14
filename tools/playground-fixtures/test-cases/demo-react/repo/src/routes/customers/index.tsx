import { useCustomers } from "@/hooks/use-customers"
import { CustomerRow } from "./components/CustomerRow"

export function CustomersPage() {
  const { data: customers, isPending, isError } = useCustomers()
  if (isPending) return <p>Loading the customers…</p>
  if (isError) return <p>The customers could not be loaded.</p>
  return (
    <table>
      <tbody>
        {customers.map((customer) => (
          <CustomerRow key={customer.id} customer={customer} />
        ))}
      </tbody>
    </table>
  )
}
