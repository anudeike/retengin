interface CustomerRow {
  customer_id: string
  email: string
  display_name: string | null
  balance: number
}

interface CustomerTableProps {
  customers: CustomerRow[]
}

export function CustomerTable({ customers }: CustomerTableProps) {
  if (customers.length === 0) {
    return <p className="text-gray-400 text-sm py-6 text-center">No customers yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Customer</th>
            <th className="text-right py-2 font-medium text-gray-500">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {customers.map((c) => (
            <tr key={c.customer_id}>
              <td className="py-3 pr-4">
                <p className="font-medium">{c.display_name ?? c.email}</p>
                {c.display_name && <p className="text-xs text-gray-400">{c.email}</p>}
              </td>
              <td className="py-3 text-right font-bold">{c.balance.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
