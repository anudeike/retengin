import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
    return <p className="text-muted-foreground text-sm py-6 text-center">No customers yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => (
          <TableRow key={c.customer_id}>
            <TableCell>
              <p className="font-medium">{c.display_name ?? c.email}</p>
              {c.display_name && <p className="text-xs text-muted-foreground">{c.email}</p>}
            </TableCell>
            <TableCell className="text-right font-bold">{c.balance.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
