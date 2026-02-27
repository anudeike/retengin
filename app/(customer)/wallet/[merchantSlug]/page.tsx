import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { PointsHistory } from '@/components/customer/PointsHistory'
import { RewardProgress } from '@/components/customer/RewardProgress'
import { RealtimeWallet } from '@/components/customer/RealtimeWallet'
import { RewardUnlockToast } from '@/components/customer/RewardUnlockToast'
import { ReferralCard } from '@/components/customer/ReferralCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateReferralCode } from '@/lib/referrals/code'

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

  const { data: customer } = await supabase
    .from('customers')
    .select('id, referral_code')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!customer) redirect('/')

  // Ensure referral code is generated
  const service = createServiceRoleClient()
  let referralCode = customer.referral_code
  if (!referralCode) {
    referralCode = generateReferralCode()
    await service.from('customers').update({ referral_code: referralCode }).eq('id', customer.id)
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug, logo_url')
    .eq('slug', merchantSlug)
    .eq('status', 'active')
    .maybeSingle()
  if (!merchant) notFound()

  const { data: balanceRow } = await supabase
    .from('customer_merchant_balances')
    .select('balance')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  const balance = balanceRow?.balance ?? 0

  const { data: transactions } = await supabase
    .from('point_transactions')
    .select('id, transaction_type, points, balance_after, created_at, note')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: rewards } = await supabase
    .from('rewards')
    .select('id, name, points_required')
    .eq('merchant_id', merchant.id)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  const { data: rules } = await supabase
    .from('merchant_point_rules')
    .select('messaging_style, points_per_dollar')
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  const { data: redemptionRows } = await supabase
    .from('reward_redemptions')
    .select('reward_id')
    .eq('customer_id', customer.id)
    .eq('merchant_id', merchant.id)
    .eq('status', 'approved')

  const redemptions: Record<string, number> = {}
  for (const row of redemptionRows ?? []) {
    redemptions[row.reward_id] = (redemptions[row.reward_id] ?? 0) + 1
  }

  // Referral stats for this merchant
  const { data: referralRows } = await service
    .from('referrals')
    .select('status')
    .eq('referrer_id', customer.id)
    .eq('merchant_id', merchant.id)

  const completedReferrals = (referralRows ?? []).filter((r) => r.status === 'completed').length
  const pendingReferrals = (referralRows ?? []).filter((r) => r.status === 'wallet_created').length

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <main className="min-h-screen bg-background">
      <RealtimeWallet customerId={customer.id} onPointsUpdate={() => {}} />
      <RewardUnlockToast
        previousBalance={Math.max(0, balance - 0)}
        currentBalance={balance}
        rewards={rewards ?? []}
      />
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/wallet">← All merchants</Link>
        </Button>

        <div className="flex items-center gap-4 mb-6">
          {merchant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={merchant.logo_url}
              alt={merchant.business_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
              {merchant.business_name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{merchant.business_name}</h1>
            <p className="text-3xl font-bold">{balance.toLocaleString()} <span className="text-base font-normal text-muted-foreground">pts</span></p>
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Rewards</h2>
            <RewardProgress
              currentBalance={balance}
              rewards={rewards ?? []}
              redemptions={redemptions}
              messagingStyle={(rules?.messaging_style as 'points_away' | 'spend_more') ?? 'points_away'}
              pointsPerDollar={Number(rules?.points_per_dollar ?? 1)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">History</h2>
            <PointsHistory transactions={transactions ?? []} />
          </CardContent>
        </Card>

        <div className="mt-4">
          <ReferralCard
            referralCode={referralCode!}
            merchantSlug={merchant.slug}
            merchantName={merchant.business_name}
            appUrl={appUrl}
            completedCount={completedReferrals}
            pendingCount={pendingReferrals}
          />
        </div>
      </div>
    </main>
  )
}
