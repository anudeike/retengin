import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

export default async function EmailPreferencesPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const service = createServiceRoleClient()

  const { data: customer } = await service
    .from('customers')
    .select('id, email_global_opt_out')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!customer) redirect('/')

  // Merchants the customer has interacted with (has a balance row)
  const { data: balances } = await service
    .from('customer_merchant_balances')
    .select('merchant_id, merchants(business_name, slug)')
    .eq('customer_id', customer.id)

  const merchantIds = (balances ?? []).map((b) => b.merchant_id)

  // Per-merchant opt-out prefs
  const { data: prefs } = await service
    .from('customer_merchant_email_prefs')
    .select('merchant_id, opted_out')
    .eq('customer_id', customer.id)
    .in('merchant_id', merchantIds.length > 0 ? merchantIds : ['00000000-0000-0000-0000-000000000000'])

  const prefMap = new Map((prefs ?? []).map((p) => [p.merchant_id, p.opted_out]))

  async function setGlobalOptOut(formData: FormData) {
    'use server'
    const optOut = formData.get('global_opt_out') === 'on'
    const svc = createServiceRoleClient()
    await svc.from('customers').update({ email_global_opt_out: optOut }).eq('id', customer!.id)
    revalidatePath('/wallet/preferences')
  }

  async function setMerchantOptOut(formData: FormData) {
    'use server'
    const merchantId = formData.get('merchant_id') as string
    const optOut = formData.get('opted_out') === 'on'
    const svc = createServiceRoleClient()
    await svc
      .from('customer_merchant_email_prefs')
      .upsert({ customer_id: customer!.id, merchant_id: merchantId, opted_out: optOut }, { onConflict: 'customer_id,merchant_id' })
    revalidatePath('/wallet/preferences')
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Email preferences</h1>
      <p className="text-sm text-gray-500 mb-8">Control which emails Taplo sends you.</p>

      {/* Global opt-out */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">All Taplo emails</h2>
        <p className="text-sm text-gray-500 mb-4">
          Turn this off to stop receiving all transactional emails from Taplo.
        </p>
        <form action={setGlobalOptOut}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="global_opt_out"
              defaultChecked={customer.email_global_opt_out}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Unsubscribe from all emails</span>
          </label>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
          >
            Save
          </button>
        </form>
      </section>

      {/* Per-merchant opt-outs */}
      {(balances ?? []).length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Per-merchant emails</h2>
          <p className="text-sm text-gray-500 mb-4">
            Opt out of emails from specific merchants while keeping others active.
          </p>
          <div className="space-y-4">
            {(balances ?? []).map((b) => {
              const m = b.merchants as { business_name: string; slug: string } | null
              if (!m) return null
              const optedOut = prefMap.get(b.merchant_id) ?? false
              return (
                <form key={b.merchant_id} action={setMerchantOptOut} className="flex items-center justify-between">
                  <input type="hidden" name="merchant_id" value={b.merchant_id} />
                  <span className="text-sm text-gray-800">{m.business_name}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="opted_out"
                      defaultChecked={optedOut}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-500">Unsubscribe</span>
                    <button type="submit" className="ml-2 text-xs text-gray-400 underline hover:text-gray-600">
                      Save
                    </button>
                  </label>
                </form>
              )
            })}
          </div>
        </section>
      )}

      <div className="mt-6">
        <a href="/wallet" className="text-sm text-gray-400 hover:text-gray-600 underline">
          ← Back to wallet
        </a>
      </div>
    </main>
  )
}
