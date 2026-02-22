import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  let query = supabase
    .from('customers')
    .select('id, email, display_name, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    query = query.ilike('email', `%${q}%`)
  }

  const { data: customers } = await query

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6">
          <Link href="/admin">← Admin</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Customers</h1>

        <form method="GET" className="mb-4">
          <Input name="q" defaultValue={q} placeholder="Search by email..." />
        </form>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                      {c.email}
                    </Link>
                    {c.display_name && <p className="text-xs text-muted-foreground">{c.display_name}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {(customers ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">No customers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </main>
  )
}
