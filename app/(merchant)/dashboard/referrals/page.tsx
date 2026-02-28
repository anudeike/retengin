import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ReferralTierForm from '@/components/merchant/ReferralTierForm'
import { sendMerchantInviteEmail } from '@/lib/referrals/invite'

function formatReward(
  type: string,
  merchantPoints: number,
  taploPoints: number,
  title: string | null,
  value: number | null,
): string {
  switch (type) {
    case 'points':
      return `${merchantPoints} pts${taploPoints > 0 ? ` + ${taploPoints} Taplo pts` : ''}`
    case 'item':
      return title ?? 'Item reward'
    case 'discount_percent':
      return `${value ?? 0}%${title ? ` — ${title}` : ''} off`
    case 'discount_flat':
      return `$${(value ?? 0).toFixed(2)}${title ? ` — ${title}` : ''} off`
    default:
      return '—'
  }
}

export default async function MerchantReferralsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!merchant) redirect('/')

  const service = createServiceRoleClient()

  // Load program + tiers
  const { data: program } = await service
    .from('referral_programs')
    .select(
      'id, is_enabled, name, description, purchase_count_required, ends_at, max_referrals_per_customer, clawback_on_refund',
    )
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

  // --- Server actions ---

  async function toggleProgram(formData: FormData) {
    'use server'
    const svc = createServiceRoleClient()
    const enabled = formData.get('enabled') === 'true'
    if (program) {
      await svc
        .from('referral_programs')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', program.id)
    } else {
      await svc.from('referral_programs').insert({ merchant_id: merchant!.id, is_enabled: enabled })
    }
    redirect('/dashboard/referrals')
  }

  async function updateProgram(formData: FormData) {
    'use server'
    const svc = createServiceRoleClient()
    const name = (formData.get('name') as string | null) || null
    const description = (formData.get('description') as string | null) || null
    const purchaseCountRequired = Math.max(1, Number(formData.get('purchase_count_required') ?? 1))
    const endsAtRaw = formData.get('ends_at') as string | null
    const endsAt = endsAtRaw ? new Date(endsAtRaw).toISOString() : null
    const maxReferrals = formData.get('max_referrals_per_customer')
    const maxReferralsNum = maxReferrals ? Number(maxReferrals) : null
    const clawback = formData.get('clawback_on_refund') === 'true'

    if (program) {
      await svc
        .from('referral_programs')
        .update({
          name,
          description,
          purchase_count_required: purchaseCountRequired,
          ends_at: endsAt,
          max_referrals_per_customer: maxReferralsNum,
          clawback_on_refund: clawback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', program.id)
    } else {
      await svc.from('referral_programs').insert({
        merchant_id: merchant!.id,
        is_enabled: false,
        name,
        description,
        purchase_count_required: purchaseCountRequired,
        ends_at: endsAt,
        max_referrals_per_customer: maxReferralsNum,
        clawback_on_refund: clawback,
      })
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
        .select('id, is_enabled, name, description, purchase_count_required, ends_at, max_referrals_per_customer, clawback_on_refund')
        .single()
      prog = data
    }
    if (!prog) return

    const referrerType = (formData.get('referrer_reward_type') as string) || 'points'
    const refereeType = (formData.get('referee_reward_type') as string) || 'points'

    await svc.from('referral_spend_tiers').upsert(
      {
        referral_program_id: prog.id,
        min_spend_cents: Math.round(Number(formData.get('min_spend_dollars')) * 100),
        referrer_reward_type: referrerType as 'points' | 'item' | 'discount_percent' | 'discount_flat',
        referrer_merchant_points: referrerType === 'points' ? Number(formData.get('referrer_merchant_points') ?? 0) : 0,
        referrer_taplo_points: referrerType === 'points' ? Number(formData.get('referrer_taplo_points') ?? 0) : 0,
        referrer_reward_title: referrerType !== 'points' ? (formData.get('referrer_reward_title') as string | null) : null,
        referrer_reward_value: referrerType === 'discount_percent' || referrerType === 'discount_flat'
          ? Number(formData.get('referrer_reward_value') ?? 0)
          : null,
        referee_reward_type: refereeType as 'points' | 'item' | 'discount_percent' | 'discount_flat',
        referee_merchant_points: refereeType === 'points' ? Number(formData.get('referee_merchant_points') ?? 0) : 0,
        referee_taplo_points: refereeType === 'points' ? Number(formData.get('referee_taplo_points') ?? 0) : 0,
        referee_reward_title: refereeType !== 'points' ? (formData.get('referee_reward_title') as string | null) : null,
        referee_reward_value: refereeType === 'discount_percent' || refereeType === 'discount_flat'
          ? Number(formData.get('referee_reward_value') ?? 0)
          : null,
      },
      { onConflict: 'referral_program_id,min_spend_cents' },
    )
    redirect('/dashboard/referrals')
  }

  async function deleteTier(formData: FormData) {
    'use server'
    const svc = createServiceRoleClient()
    await svc.from('referral_spend_tiers').delete().eq('id', formData.get('tier_id') as string)
    redirect('/dashboard/referrals')
  }

  async function sendMerchantInvite(formData: FormData) {
    'use server'
    const email = (formData.get('invite_email') as string | null)?.trim()
    if (!email) return
    // Fire-and-forget — don't block the page redirect on email delivery
    void sendMerchantInviteEmail(email, merchant!.id, merchant!.business_name, merchant!.slug)
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

        {/* Program settings */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Program settings</h2>
                <p className="text-sm text-muted-foreground">
                  {program?.is_enabled
                    ? 'Active — customers can earn referral bonuses'
                    : 'Disabled — no bonuses awarded'}
                </p>
              </div>
              <form action={toggleProgram}>
                <input type="hidden" name="enabled" value={program?.is_enabled ? 'false' : 'true'} />
                <Button
                  type="submit"
                  variant={program?.is_enabled ? 'outline' : 'default'}
                  size="sm"
                >
                  {program?.is_enabled ? 'Disable' : 'Enable'}
                </Button>
              </form>
            </div>

            <form action={updateProgram} className="space-y-4 border-t pt-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Program name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={program?.name ?? ''}
                  placeholder="e.g. Friends &amp; Family Program"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (shown on public program page)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  defaultValue={program?.description ?? ''}
                  placeholder="Refer a friend and you both get rewarded!"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="purchase_count_required"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Purchases required
                  </label>
                  <input
                    id="purchase_count_required"
                    name="purchase_count_required"
                    type="number"
                    min="1"
                    defaultValue={program?.purchase_count_required ?? 1}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="max_referrals_per_customer"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Max referrals / person
                  </label>
                  <input
                    id="max_referrals_per_customer"
                    name="max_referrals_per_customer"
                    type="number"
                    min="1"
                    defaultValue={program?.max_referrals_per_customer ?? ''}
                    placeholder="Unlimited"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ends_at"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Expiry date (optional)
                  </label>
                  <input
                    id="ends_at"
                    name="ends_at"
                    type="date"
                    defaultValue={
                      program?.ends_at ? program.ends_at.slice(0, 10) : ''
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="clawback_on_refund"
                      value="true"
                      defaultChecked={program?.clawback_on_refund ?? false}
                      className="rounded border-gray-300"
                    />
                    Claw back on refund
                  </label>
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full">
                Save settings
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Spend tiers */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-1">Spend tiers</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Rewards are awarded when the referee&apos;s qualifying purchase meets a minimum spend.
            </p>

            {(tiers ?? []).length > 0 ? (
              <div className="space-y-2 mb-4">
                {(tiers ?? []).map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-start justify-between text-sm border rounded-md p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        Min spend: ${(tier.min_spend_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-muted-foreground">
                        Referrer:{' '}
                        {formatReward(
                          tier.referrer_reward_type,
                          tier.referrer_merchant_points,
                          tier.referrer_taplo_points,
                          tier.referrer_reward_title,
                          tier.referrer_reward_value,
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        Referee:{' '}
                        {formatReward(
                          tier.referee_reward_type,
                          tier.referee_merchant_points,
                          tier.referee_taplo_points,
                          tier.referee_reward_title,
                          tier.referee_reward_value,
                        )}
                      </p>
                    </div>
                    <form action={deleteTier}>
                      <input type="hidden" name="tier_id" value={tier.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0"
                      >
                        Remove
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">No tiers configured yet.</p>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Add tier</p>
              <ReferralTierForm action={addTier} />
            </div>
          </CardContent>
        </Card>

        {/* Direct invite */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-1">Invite a customer directly</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Send an invitation email to a customer who doesn&apos;t have a referral link yet.
            </p>
            <form action={sendMerchantInvite} className="flex gap-2">
              <input
                name="invite_email"
                type="email"
                required
                placeholder="customer@example.com"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm">
                Send invite
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
