import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  points_required: z.coerce.number().int().positive(),
})

export default async function NewRewardPage() {
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

  async function createReward(formData: FormData) {
    'use server'
    const raw = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      points_required: formData.get('points_required'),
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) return

    const service = createServiceRoleClient()
    await service.from('rewards').insert({
      merchant_id: merchant!.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      points_required: parsed.data.points_required,
    })

    redirect('/dashboard/rewards')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard/rewards">← Rewards</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">New Reward</h1>

        <Card>
          <CardContent className="p-6">
            <form action={createReward} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Reward name *</Label>
                <Input id="name" name="name" required maxLength={100} placeholder="Free coffee" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" maxLength={300} placeholder="One free drip coffee of any size" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="points_required">Points required *</Label>
                <Input id="points_required" name="points_required" type="number" min={1} required placeholder="500" />
              </div>
              <Button type="submit">Create reward</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
