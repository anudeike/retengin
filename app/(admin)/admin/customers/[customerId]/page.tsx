import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { PointsHistory } from '@/components/customer/PointsHistory'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { customerId } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: customer } = await supabase
    .from('customers')
    .select('id, email, display_name, created_at')
    .eq('id', customerId)
    .maybeSingle()

  if (!customer) notFound()

  const { data: balances } = await supabase
    .from('customer_merchant_balances')
    .select('balance, merchants(business_name, slug)')
    .eq('customer_id', customerId)
    .order('balance', { ascending: false })

  const { data: transactions } = await supabase
    .from('point_transactions')
    .select('id, transaction_type, points, balance_after, created_at, note')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/admin/customers">← Customers</Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{customer.email}</h1>
          {customer.display_name && <p className="text-muted-foreground">{customer.display_name}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            Joined {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>

        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Balances
            </h2>
            {(balances ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">No balances.</p>
            ) : (
              <ul className="space-y-2">
                {(balances ?? []).map((b, i) => {
                  const m = b.merchants as unknown as { business_name: string; slug: string } | null
                  return (
                    <li key={i} className="flex justify-between text-sm">
                      <span>{m?.business_name ?? '—'}</span>
                      <span className="font-bold">{b.balance.toLocaleString()} pts</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Full Ledger
            </h2>
            <PointsHistory transactions={transactions ?? []} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
