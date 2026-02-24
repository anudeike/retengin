import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAppUrl } from '@/lib/utils/request-url'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    const appUrl = await getAppUrl()

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

    await service.from('merchant_point_rules').insert({
      merchant_id: merchant.id,
      points_per_dollar: 1,
      min_spend_cents: 0,
      min_redemption_points: 100,
      is_active: true,
    })

    await service.auth.admin.inviteUserByEmail(
      parsed.data.contact_email.toLowerCase(),
      {
        redirectTo: `${appUrl}/api/auth/callback?role=merchant`,
      },
    )

    redirect('/admin/merchants')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/admin/merchants">← Merchants</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Onboard Merchant</h1>

        <Card>
          <CardContent className="p-6">
            <form action={createMerchant} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business name *</Label>
                <Input id="business_name" name="business_name" required maxLength={120} placeholder="Joe's Coffee" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">Contact email *</Label>
                <Input id="contact_email" name="contact_email" type="email" required placeholder="owner@joescoffee.com" />
                <p className="text-xs text-muted-foreground">An invite link will be sent to this email.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug (URL path) *</Label>
                <Input id="slug" name="slug" required pattern="[a-z0-9-]+" maxLength={64} placeholder="joes-coffee" />
                <p className="text-xs text-muted-foreground">
                  Becomes: taplo.app/join/<strong>your-slug</strong>
                </p>
              </div>
              <Button type="submit">Create &amp; send invite</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
