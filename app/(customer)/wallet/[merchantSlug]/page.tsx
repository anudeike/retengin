import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { PointsHistory } from '@/components/customer/PointsHistory'
import { RewardProgress } from '@/components/customer/RewardProgress'
import { RealtimeWallet } from '@/components/customer/RealtimeWallet'
import { RewardUnlockToast } from '@/components/customer/RewardUnlockToast'

interface Props {
  params: Promise<{ merchantSlug: string }>
}

export default async function MerchantWalletPage({ params }: Props) {
  const { merchantSlug } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!customer) redirect('/')

  // Fetch merchant
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug, logo_url')
    .eq('slug', merchantSlug)
    .eq('status', 'active')
    .maybeSingle()
  if (!merchant) notFound()

  // Fetch balance
  const { data: balanceRow } = await supabase
    .from('customer_merchant_balances')
    .select('balance')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  const balance = balanceRow?.balance ?? 0

  // Fetch last 20 transactions
  const { data: transactions } = await supabase
    .from('point_transactions')
    .select('id, transaction_type, points, balance_after, created_at, note')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch active rewards
  const { data: rewards } = await supabase
    .from('rewards')
    .select('id, name, points_required')
    .eq('merchant_id', merchant.id)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Realtime subscription — triggers router.refresh() on new transactions */}
      <RealtimeWallet customerId={customer.id} onPointsUpdate={() => {
        // Handled by the router refresh in the client component
      }} />
      {/* Reward unlock toast */}
      <RewardUnlockToast
        previousBalance={Math.max(0, balance - 0)}
        currentBalance={balance}
        rewards={rewards ?? []}
      />
      <div className="max-w-lg mx-auto p-6">
        {/* Back link */}
        <Link href="/wallet" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← All merchants
        </Link>

        {/* Merchant header */}
        <div className="flex items-center gap-4 mb-6">
          {merchant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={merchant.logo_url}
              alt={merchant.business_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-400">
              {merchant.business_name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{merchant.business_name}</h1>
            <p className="text-3xl font-bold">{balance.toLocaleString()} <span className="text-base font-normal text-gray-500">pts</span></p>
          </div>
        </div>

        {/* Reward progress */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Rewards
          </h2>
          <RewardProgress currentBalance={balance} rewards={rewards ?? []} />
        </section>

        {/* Transaction history */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            History
          </h2>
          <PointsHistory transactions={transactions ?? []} />
        </section>
      </div>
    </main>
  )
}
