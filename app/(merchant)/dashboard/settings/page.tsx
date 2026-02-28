import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PointRuleForm } from '@/components/merchant/PointRuleForm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function MerchantSettingsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug, contact_email, logo_url, emails_enabled')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!merchant) redirect('/')

  const { data: rules } = await supabase
    .from('merchant_point_rules')
    .select('*')
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  async function setEmailsEnabled(formData: FormData) {
    'use server'
    const enabled = formData.get('emails_enabled') === 'on'
    const service = createServiceRoleClient()
    await service
      .from('merchants')
      .update({ emails_enabled: enabled })
      .eq('id', merchant!.id)
  }

  async function saveRules(values: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
    messaging_style: 'points_away' | 'spend_more'
  }) {
    'use server'
    const service = createServiceRoleClient()
    await service
      .from('merchant_point_rules')
      .upsert({
        merchant_id: merchant!.id,
        ...values,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id' })
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Card className="mb-4">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold mb-1">Business</h2>
            <p className="text-sm text-muted-foreground mb-4">{merchant.business_name}</p>
            <p className="text-sm text-muted-foreground">
              Taplo join URL: <span className="font-mono">/join/{merchant.slug}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold mb-4">Point rules</h2>
            <PointRuleForm
              initialValues={rules ? {
                ...rules,
                messaging_style: (rules.messaging_style as 'points_away' | 'spend_more') ?? 'points_away',
              } : undefined}
              onSave={saveRules}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold mb-1">Transactional emails</h2>
            <p className="text-sm text-muted-foreground mb-4">
              When enabled, Taplo sends your customers emails for points earned, reward unlocks, redemptions, and referrals.
            </p>
            <form action={setEmailsEnabled}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="emails_enabled"
                  defaultChecked={merchant.emails_enabled ?? true}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Send emails to customers</span>
              </label>
              <Button type="submit" size="sm" className="mt-4">Save</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
