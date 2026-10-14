import type { Customer } from "@/types/customer"

export function CustomerRow({ customer }: { customer: Customer }) {
  return (
    <tr>
      <td>{customer.name}</td>
      <td>{customer.email}</td>
    </tr>
  )
}
