import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { QRCodeDisplay } from '@/components/merchant/QRCodeDisplay'

export default async function MerchantDashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug, status, square_merchant_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!merchant) redirect('/')

  // Stats: total customers with balance > 0
  const { count: customerCount } = await supabase
    .from('customer_merchant_balances')
    .select('customer_id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)

  // Stats: total points issued (sum of earned transactions)
  const { data: ptStats } = await supabase
    .from('point_transactions')
    .select('points')
    .eq('merchant_id', merchant.id)
    .eq('transaction_type', 'earned')

  const totalPointsIssued = (ptStats ?? []).reduce((s, t) => s + t.points, 0)

  // Recent redemptions
  const { data: recentRedemptions } = await supabase
    .from('reward_redemptions')
    .select('id, points_spent, redeemed_at, rewards(name), customers(email)')
    .eq('merchant_id', merchant.id)
    .order('redeemed_at', { ascending: false })
    .limit(5)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <p className="text-sm text-gray-500">Merchant dashboard</p>
          <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
          {merchant.status !== 'active' && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
              {merchant.status}
            </span>
          )}
        </div>

        {/* Square connection warning */}
        {!merchant.square_merchant_id && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-sm text-yellow-800 font-medium">Square not connected</p>
            <p className="text-xs text-yellow-700 mt-1">
              Connect your Square account so points are awarded automatically.
            </p>
            <Link href="/dashboard/connect" className="text-xs underline text-yellow-900 mt-1 inline-block">
              Connect now →
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Customers</p>
            <p className="text-3xl font-bold">{(customerCount ?? 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Points issued</p>
            <p className="text-3xl font-bold">{totalPointsIssued.toLocaleString()}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { href: '/dashboard/redeem', label: 'Redeem Points' },
            { href: '/dashboard/customers', label: 'Customers' },
            { href: '/dashboard/rewards', label: 'Rewards' },
            { href: '/dashboard/settings', label: 'Settings' },
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

        {/* Recent redemptions */}
        {(recentRedemptions ?? []).length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recent Redemptions
            </h2>
            <ul className="divide-y divide-gray-100">
              {(recentRedemptions ?? []).map((r) => {
                const reward = r.rewards as unknown as { name: string } | null
                const customer = r.customers as unknown as { email: string } | null
                return (
                  <li key={r.id} className="py-2.5 flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{reward?.name ?? '—'}</p>
                      <p className="text-gray-400 text-xs">{customer?.email}</p>
                    </div>
                    <p className="text-orange-600 font-bold">-{r.points_spent} pts</p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* QR Code */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Your Join QR Code
          </h2>
          <QRCodeDisplay slug={merchant.slug} appUrl={appUrl} />
        </section>
      </div>
    </main>
  )
}
