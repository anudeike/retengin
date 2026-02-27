import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { WalletCard } from '@/components/customer/WalletCard'
import { ClosestRewards } from '@/components/customer/ClosestRewards'
import { Card, CardContent } from '@/components/ui/card'

export default async function WalletPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: customer } = await supabase
    .from('customers')
    .select('id, display_name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!customer) redirect('/')

  const { data: balances } = await supabase
    .from('customer_merchant_balances')
    .select('balance, merchant_id, merchants(business_name, slug, logo_url)')
    .eq('customer_id', customer.id)
    .gt('balance', 0)
    .order('balance', { ascending: false })

  const totalPoints = (balances ?? []).reduce((sum, b) => sum + b.balance, 0)

  // "Closest to Unlocking" — cross-merchant rewards sorted by proximity
  // Only considers merchants where the customer has a balance > 0
  const merchantIds = (balances ?? []).map((b) => b.merchant_id)
  let closestRewards: Array<{
    rewardId: string
    rewardName: string
    pointsRequired: number
    currentBalance: number
    merchantName: string
    merchantSlug: string
  }> = []

  if (merchantIds.length > 0) {
    const { data: rewardRows } = await supabase
      .from('rewards')
      .select('id, name, points_required, merchant_id, merchants(business_name, slug)')
      .in('merchant_id', merchantIds)
      .eq('is_active', true)

    closestRewards = (rewardRows ?? [])
      .map((r) => {
        const balance = (balances ?? []).find((b) => b.merchant_id === r.merchant_id)?.balance ?? 0
        const m = r.merchants as unknown as { business_name: string; slug: string } | null
        if (!m || balance >= r.points_required) return null
        return {
          rewardId: r.id,
          rewardName: r.name,
          pointsRequired: r.points_required,
          currentBalance: balance,
          merchantName: m.business_name,
          merchantSlug: m.slug,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (a.pointsRequired - a.currentBalance) - (b.pointsRequired - b.currentBalance))
      .slice(0, 5)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-bold">{customer.display_name ?? customer.email}</h1>
        </div>

        <Card className="bg-foreground text-background mb-6">
          <CardContent className="p-6">
            <p className="text-sm opacity-70 mb-1">Total Taplo Points</p>
            <p className="text-5xl font-bold">{totalPoints.toLocaleString()}</p>
            <p className="text-xs opacity-50 mt-2">across {(balances ?? []).length} merchants</p>
          </CardContent>
        </Card>

        {closestRewards.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Closest to Unlocking
            </h2>
            <div className="mb-6">
              <ClosestRewards items={closestRewards} />
            </div>
          </>
        )}

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Your Points
        </h2>

        {(balances ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🎁</p>
            <p className="font-medium">No points yet</p>
            <p className="text-sm mt-1">Scan a merchant&apos;s QR code to start earning.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(balances ?? []).map((b) => {
              const m = b.merchants as unknown as { business_name: string; slug: string; logo_url: string | null } | null
              if (!m) return null
              return (
                <WalletCard
                  key={b.merchant_id}
                  merchantSlug={m.slug}
                  merchantName={m.business_name}
                  balance={b.balance}
                  logoUrl={m.logo_url}
                />
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
