import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function MerchantReferralsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!merchant) redirect('/')

  const service = createServiceRoleClient()

  // Load program + tiers
  const { data: program } = await service
    .from('referral_programs')
    .select('id, is_enabled')
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  const { data: tiers } = program
    ? await service
        .from('referral_spend_tiers')
        .select('*')
        .eq('referral_program_id', program.id)
        .order('min_spend_cents', { ascending: true })
    : { data: [] }

  // Referral stats
  const { data: referrals } = await service
    .from('referrals')
    .select('status, completed_at, first_purchase_cents')
    .eq('merchant_id', merchant.id)

  const completed = (referrals ?? []).filter((r) => r.status === 'completed')
  const pending = (referrals ?? []).filter((r) => r.status === 'wallet_created')
  const totalFirstPurchaseCents = completed.reduce((s, r) => s + (r.first_purchase_cents ?? 0), 0)

  // Server actions
  async function toggleProgram(formData: FormData) {
    'use server'
    const svc = createServiceRoleClient()
    const enabled = formData.get('enabled') === 'true'
    if (program) {
      await svc.from('referral_programs').update({ is_enabled: enabled, updated_at: new Date().toISOString() }).eq('id', program.id)
    } else {
      await svc.from('referral_programs').insert({ merchant_id: merchant!.id, is_enabled: enabled })
    }
    redirect('/dashboard/referrals')
  }

  async function addTier(formData: FormData) {
    'use server'
    const svc = createServiceRoleClient()
    let prog = program
    if (!prog) {
      const { data } = await svc
        .from('referral_programs')
        .insert({ merchant_id: merchant!.id, is_enabled: false })
        .select('id, is_enabled')
        .single()
      prog = data
    }
    if (!prog) return
    await svc.from('referral_spend_tiers').upsert({
      referral_program_id: prog.id,
      min_spend_cents: Math.round(Number(formData.get('min_spend_dollars')) * 100),
      referrer_merchant_points: Number(formData.get('referrer_merchant_points')),
      referrer_taplo_points: Number(formData.get('referrer_taplo_points')),
      referee_merchant_points: Number(formData.get('referee_merchant_points')),
      referee_taplo_points: Number(formData.get('referee_taplo_points')),
    }, { onConflict: 'referral_program_id,min_spend_cents' })
    redirect('/dashboard/referrals')
  }

  async function deleteTier(formData: FormData) {
    'use server'
    const svc = createServiceRoleClient()
    await svc.from('referral_spend_tiers').delete().eq('id', formData.get('tier_id') as string)
    redirect('/dashboard/referrals')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Referral Program</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">${(totalFirstPurchaseCents / 100).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Enable / disable */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Program status</h2>
                <p className="text-sm text-muted-foreground">
                  {program?.is_enabled ? 'Active — customers can earn referral bonuses' : 'Disabled — no bonuses awarded'}
                </p>
              </div>
              <form action={toggleProgram}>
                <input type="hidden" name="enabled" value={program?.is_enabled ? 'false' : 'true'} />
                <Button type="submit" variant={program?.is_enabled ? 'outline' : 'default'} size="sm">
                  {program?.is_enabled ? 'Disable' : 'Enable'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Spend tiers */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-1">Spend tiers</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set bonus points awarded when the referred customer&apos;s first purchase meets a minimum spend.
            </p>

            {(tiers ?? []).length > 0 ? (
              <div className="space-y-2 mb-4">
                {(tiers ?? []).map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between text-sm border rounded-md p-3">
                    <div className="space-y-0.5">
                      <p className="font-medium">Min spend: ${(tier.min_spend_cents / 100).toFixed(2)}</p>
                      <p className="text-muted-foreground">
                        Referrer: +{tier.referrer_merchant_points} pts{tier.referrer_taplo_points > 0 ? ` (+${tier.referrer_taplo_points} Taplo)` : ''}
                      </p>
                      <p className="text-muted-foreground">
                        Referee: +{tier.referee_merchant_points} pts{tier.referee_taplo_points > 0 ? ` (+${tier.referee_taplo_points} Taplo)` : ''}
                      </p>
                    </div>
                    <form action={deleteTier}>
                      <input type="hidden" name="tier_id" value={tier.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Remove
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">No tiers configured yet.</p>
            )}

            <form action={addTier} className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Add tier</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground" htmlFor="min_spend_dollars">Min spend ($)</label>
                  <input
                    id="min_spend_dollars"
                    name="min_spend_dollars"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    required
                    className="w-full mt-1 rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
                <div />
                <div>
                  <label className="text-xs text-muted-foreground" htmlFor="referrer_merchant_points">Referrer pts</label>
                  <input
                    id="referrer_merchant_points"
                    name="referrer_merchant_points"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                    className="w-full mt-1 rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground" htmlFor="referee_merchant_points">Referee pts</label>
                  <input
                    id="referee_merchant_points"
                    name="referee_merchant_points"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                    className="w-full mt-1 rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground" htmlFor="referrer_taplo_points">Referrer Taplo pts</label>
                  <input
                    id="referrer_taplo_points"
                    name="referrer_taplo_points"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                    className="w-full mt-1 rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground" htmlFor="referee_taplo_points">Referee Taplo pts</label>
                  <input
                    id="referee_taplo_points"
                    name="referee_taplo_points"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                    className="w-full mt-1 rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full">Add tier</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
