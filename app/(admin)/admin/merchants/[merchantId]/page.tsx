import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MerchantStatusBadge } from '@/components/admin/MerchantStatusBadge'
import type { Enums } from '@/types/database.types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  params: Promise<{ merchantId: string }>
}

export default async function AdminMerchantDetailPage({ params }: Props) {
  const { merchantId } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .maybeSingle()

  if (!merchant) notFound()

  const { data: rules } = await supabase
    .from('merchant_point_rules')
    .select('*')
    .eq('merchant_id', merchantId)
    .maybeSingle()

  const { count: customerCount } = await supabase
    .from('customer_merchant_balances')
    .select('customer_id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)

  async function setStatus(formData: FormData) {
    'use server'
    const newStatus = formData.get('status') as string
    if (!['pending', 'active', 'suspended'].includes(newStatus)) return
    const service = createServiceRoleClient()
    await service
      .from('merchants')
      .update({ status: newStatus as Enums<'merchant_status'>, updated_at: new Date().toISOString() })
      .eq('id', merchantId)
    redirect(`/admin/merchants/${merchantId}`)
  }

  async function resendInvite() {
    'use server'
    const service = createServiceRoleClient()
    const { data: merchant } = await service
      .from('merchants')
      .select('contact_email, auth_user_id')
      .eq('id', merchantId)
      .single()
    if (!merchant || merchant.auth_user_id) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'
    const redirectTo = `${appUrl}/api/auth/callback?role=merchant`
    // Delete any existing unconfirmed auth user for this email so the re-invite
    // always lands on a clean slate (inviteUserByEmail errors if the user already
    // exists in auth.users, even when they haven't confirmed yet).
    const { data: authData } = await service.auth.admin.listUsers({ perPage: 1000 })
    const unconfirmed = authData?.users?.find(
      u => u.email?.toLowerCase() === merchant.contact_email.toLowerCase() && !u.email_confirmed_at
    )
    if (unconfirmed) await service.auth.admin.deleteUser(unconfirmed.id)
    await service.auth.admin.inviteUserByEmail(merchant.contact_email, { redirectTo })
    redirect(`/admin/merchants/${merchantId}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/admin/merchants">← Merchants</Link>
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
          <MerchantStatusBadge status={merchant.status as Enums<'merchant_status'>} />
        </div>

        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="text-muted-foreground w-32">Contact</dt><dd>{merchant.contact_email}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-32">Slug</dt><dd className="font-mono">{merchant.slug}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-32">Square ID</dt><dd>{merchant.square_merchant_id ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-32">Customers</dt><dd>{customerCount ?? 0}</dd></div>
            </dl>
          </CardContent>
        </Card>

        {!merchant.auth_user_id && (
          <Card className="mb-4">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Invite
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                This merchant hasn&apos;t claimed their account yet.
              </p>
              <form action={resendInvite}>
                <Button type="submit" variant="outline" size="sm">Resend invite</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {rules && (
          <Card className="mb-4">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Point Rules</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2"><dt className="text-muted-foreground w-40">Points/dollar</dt><dd>{rules.points_per_dollar}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-40">Min spend</dt><dd>${(rules.min_spend_cents / 100).toFixed(2)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-40">Min redemption</dt><dd>{rules.min_redemption_points} pts</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-40">Active</dt><dd>{rules.is_active ? 'Yes' : 'No'}</dd></div>
              </dl>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Change Status</h2>
            <form action={setStatus} className="flex gap-3 flex-wrap">
              {(['pending', 'active', 'suspended'] as const).map((s) => (
                <Button
                  key={s}
                  type="submit"
                  name="status"
                  value={s}
                  variant={merchant.status === s ? 'secondary' : 'outline'}
                  disabled={merchant.status === s}
                  size="sm"
                >
                  Set {s}
                </Button>
              ))}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
