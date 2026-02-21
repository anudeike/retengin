import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // System-wide stats
  const { count: merchantCount } = await supabase
    .from('merchants')
    .select('id', { count: 'exact', head: true })

  const { count: customerCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })

  const { count: txCount } = await supabase
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_type', 'earned')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <p className="text-sm text-gray-500">Admin</p>
          <h1 className="text-2xl font-bold">System Overview</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Merchants</p>
            <p className="text-3xl font-bold">{merchantCount ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Customers</p>
            <p className="text-3xl font-bold">{customerCount ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Txns (earned)</p>
            <p className="text-3xl font-bold">{txCount ?? 0}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/admin/merchants', label: 'Merchants' },
            { href: '/admin/merchants/new', label: 'Onboard Merchant' },
            { href: '/admin/customers', label: 'Customers' },
            { href: '/admin/corrections', label: 'Corrections' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block p-4 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:border-gray-400 transition text-center"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
