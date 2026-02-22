import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { MerchantStatusBadge } from '@/components/admin/MerchantStatusBadge'
import type { Enums } from '@/types/database.types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function AdminMerchantsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, business_name, slug, status, contact_email, square_merchant_id, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6">
          <Link href="/admin">← Admin</Link>
        </Button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Merchants ({(merchants ?? []).length})</h1>
          <Button asChild size="sm">
            <Link href="/admin/merchants/new">+ Onboard</Link>
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Square</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(merchants ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/admin/merchants/${m.id}`} className="font-medium hover:underline">
                      {m.business_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{m.contact_email}</p>
                  </TableCell>
                  <TableCell>
                    <MerchantStatusBadge status={m.status as Enums<'merchant_status'>} />
                  </TableCell>
                  <TableCell>
                    {m.square_merchant_id ? (
                      <span className="text-green-600 text-xs">✓ connected</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">not connected</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </main>
  )
}
