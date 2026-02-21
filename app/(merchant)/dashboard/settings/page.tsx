import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PointRuleForm } from '@/components/merchant/PointRuleForm'

export default async function MerchantSettingsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug, contact_email, logo_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!merchant) redirect('/')

  const { data: rules } = await supabase
    .from('merchant_point_rules')
    .select('*')
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  async function saveRules(values: {
    points_per_dollar: number
    min_spend_cents: number
    min_redemption_points: number
    is_active: boolean
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-base font-semibold mb-1">Business</h2>
          <p className="text-sm text-gray-500 mb-4">{merchant.business_name}</p>
          <p className="text-sm text-gray-400">
            Taplo join URL: <span className="font-mono text-gray-600">/join/{merchant.slug}</span>
          </p>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-4">Point rules</h2>
          <PointRuleForm
            initialValues={rules ?? undefined}
            onSave={saveRules}
          />
        </section>
      </div>
    </main>
  )
}
