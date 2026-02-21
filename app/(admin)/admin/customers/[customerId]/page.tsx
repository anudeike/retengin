import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { PointsHistory } from '@/components/customer/PointsHistory'

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

  // All merchant balances
  const { data: balances } = await supabase
    .from('customer_merchant_balances')
    .select('balance, merchants(business_name, slug)')
    .eq('customer_id', customerId)
    .order('balance', { ascending: false })

  // Full transaction ledger
  const { data: transactions } = await supabase
    .from('point_transactions')
    .select('id, transaction_type, points, balance_after, created_at, note')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <Link href="/admin/customers" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Customers
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{customer.email}</h1>
          {customer.display_name && <p className="text-gray-500">{customer.display_name}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Joined {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Balances across merchants */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Balances
          </h2>
          {(balances ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm">No balances.</p>
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
        </section>

        {/* Full ledger */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Full Ledger
          </h2>
          <PointsHistory transactions={transactions ?? []} />
        </section>
      </div>
    </main>
  )
}
