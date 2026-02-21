import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import { z } from 'zod'

const schema = z.object({
  business_name: z.string().min(1).max(120),
  contact_email: z.string().email(),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
})

export default async function NewMerchantPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  async function createMerchant(formData: FormData) {
    'use server'
    const raw = {
      business_name: formData.get('business_name'),
      contact_email: formData.get('contact_email'),
      slug: formData.get('slug'),
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) return

    const service = createServiceRoleClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taplo.app'

    // Create merchant record (unlinked — auth_user_id assigned on first login)
    const { data: merchant, error } = await service
      .from('merchants')
      .insert({
        business_name: parsed.data.business_name,
        contact_email: parsed.data.contact_email.toLowerCase(),
        slug: parsed.data.slug,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !merchant) return

    // Create default point rules for the merchant
    await service.from('merchant_point_rules').insert({
      merchant_id: merchant.id,
      points_per_dollar: 1,
      min_spend_cents: 0,
      min_redemption_points: 100,
      is_active: true,
    })

    // Send magic link with role=merchant
    await service.auth.admin.generateLink({
      type: 'magiclink',
      email: parsed.data.contact_email.toLowerCase(),
      options: {
        redirectTo: `${appUrl}/api/auth/callback?role=merchant`,
      },
    })

    redirect('/admin/merchants')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-6">
        <Link href="/admin/merchants" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Merchants
        </Link>
        <h1 className="text-2xl font-bold mb-6">Onboard Merchant</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form action={createMerchant} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Business name *</label>
              <input
                name="business_name"
                required
                maxLength={120}
                placeholder="Joe's Coffee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact email *</label>
              <input
                name="contact_email"
                type="email"
                required
                placeholder="owner@joescoffee.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-400 mt-1">
                An invite link will be sent to this email.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (URL path) *</label>
              <input
                name="slug"
                required
                pattern="[a-z0-9-]+"
                maxLength={64}
                placeholder="joes-coffee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-400 mt-1">
                Becomes: taplo.app/join/<strong>your-slug</strong>
              </p>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Create &amp; send invite
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
