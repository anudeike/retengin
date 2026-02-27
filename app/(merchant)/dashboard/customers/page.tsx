import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { CustomerTable } from '@/components/merchant/CustomerTable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

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

  const { data: balances } = await supabase
    .from('customer_merchant_balances')
    .select('customer_id, balance, customers(email, display_name)')
    .eq('merchant_id', merchant.id)
    .order('balance', { ascending: false })

  const { data: rewards } = await supabase
    .from('rewards')
    .select('id, name, points_required')
    .eq('merchant_id', merchant.id)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  const customers = (balances ?? []).map((b) => {
    const c = b.customers as unknown as { email: string; display_name: string | null } | null
    return {
      customer_id: b.customer_id,
      email: c?.email ?? '—',
      display_name: c?.display_name ?? null,
      balance: b.balance,
    }
  })

  // Find customers within 20% of any reward threshold (but not already past it)
  const nearThreshold = customers
    .map((c) => {
      const closest = (rewards ?? [])
        .filter((r) => c.balance < r.points_required)
        .map((r) => ({
          rewardName: r.name,
          pointsRequired: r.points_required,
          balance: c.balance,
          pct: c.balance / r.points_required,
          remaining: r.points_required - c.balance,
        }))
        .sort((a, b) => b.pct - a.pct)
        .find((r) => r.pct >= 0.8)
      if (!closest) return null
      return { ...c, closest }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.closest.pct - a.closest.pct)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">
          Customers <span className="text-muted-foreground font-normal text-lg">({customers.length})</span>
        </h1>

        {nearThreshold.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Near a Reward ({nearThreshold.length})
            </h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                {nearThreshold.map((c) => (
                  <div key={c.customer_id} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{c.display_name ?? c.email}</span>
                        {c.display_name && (
                          <span className="text-xs text-muted-foreground ml-1.5">{c.email}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {c.closest.remaining.toLocaleString()} pts from {c.closest.rewardName}
                      </span>
                    </div>
                    <Progress value={Math.round(c.closest.pct * 100)} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {c.balance.toLocaleString()} / {c.closest.pointsRequired.toLocaleString()} pts
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardContent className="p-5">
            <CustomerTable customers={customers} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
