import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { CustomerTable } from '@/components/merchant/CustomerTable'

export default async function MerchantCustomersPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!merchant) redirect('/')

  // Join with customers table to get email/display_name
  const { data: balances } = await supabase
    .from('customer_merchant_balances')
    .select('customer_id, balance, customers(email, display_name)')
    .eq('merchant_id', merchant.id)
    .order('balance', { ascending: false })

  const customers = (balances ?? []).map((b) => {
    const c = b.customers as unknown as { email: string; display_name: string | null } | null
    return {
      customer_id: b.customer_id,
      email: c?.email ?? '—',
      display_name: c?.display_name ?? null,
      balance: b.balance,
    }
  })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mb-6">
          Customers <span className="text-gray-400 font-normal text-lg">({customers.length})</span>
        </h1>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <CustomerTable customers={customers} />
        </div>
      </div>
    </main>
  )
}
