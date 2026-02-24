import { notFound, redirect } from 'next/navigation'
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

export default async function EditRewardPage({ params }: { params: Promise<{ rewardId: string }> }) {
  const { rewardId } = await params

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

  const { data: reward } = await supabase
    .from('rewards')
    .select('id, name, description, points_required')
    .eq('id', rewardId)
    .eq('merchant_id', merchant.id)
    .maybeSingle()
  if (!reward) notFound()

  async function updateReward(formData: FormData) {
    'use server'
    const raw = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      points_required: formData.get('points_required'),
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) return

    const service = createServiceRoleClient()
    await service
      .from('rewards')
      .update({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        points_required: parsed.data.points_required,
      })
      .eq('id', rewardId)
      .eq('merchant_id', merchant!.id)

    redirect('/dashboard/rewards')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard/rewards">← Rewards</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Edit Reward</h1>

        <Card>
          <CardContent className="p-6">
            <form action={updateReward} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Reward name *</Label>
                <Input id="name" name="name" required maxLength={100} defaultValue={reward.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" maxLength={300} defaultValue={reward.description ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="points_required">Points required *</Label>
                <Input id="points_required" name="points_required" type="number" min={1} required defaultValue={reward.points_required} />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
