import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MerchantStatusBadge } from '@/components/admin/MerchantStatusBadge'
import type { Enums } from '@/types/database.types'

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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <Link href="/admin/merchants" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Merchants
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
          <MerchantStatusBadge status={merchant.status as Enums<'merchant_status'>} />
        </div>

        {/* Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Contact</dt><dd>{merchant.contact_email}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Slug</dt><dd className="font-mono">{merchant.slug}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Square ID</dt><dd>{merchant.square_merchant_id ?? '—'}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Customers</dt><dd>{customerCount ?? 0}</dd></div>
          </dl>
        </section>

        {/* Point rules */}
        {rules && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Point Rules</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="text-gray-500 w-40">Points/dollar</dt><dd>{rules.points_per_dollar}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-40">Min spend</dt><dd>${(rules.min_spend_cents / 100).toFixed(2)}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-40">Min redemption</dt><dd>{rules.min_redemption_points} pts</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-40">Active</dt><dd>{rules.is_active ? 'Yes' : 'No'}</dd></div>
            </dl>
          </section>
        )}

        {/* Status toggle */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Change Status</h2>
          <form action={setStatus} className="flex gap-3 flex-wrap">
            {(['pending', 'active', 'suspended'] as const).map((s) => (
              <button
                key={s}
                type="submit"
                name="status"
                value={s}
                disabled={merchant.status === s}
                className={`px-4 py-2 text-sm rounded-lg border transition ${
                  merchant.status === s
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-default'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Set {s}
              </button>
            ))}
          </form>
        </section>
      </div>
    </main>
  )
}
