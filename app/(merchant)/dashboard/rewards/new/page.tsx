import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-6">
        <Link href="/dashboard/rewards" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Rewards
        </Link>
        <h1 className="text-2xl font-bold mb-6">New Reward</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form action={createReward} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Reward name *</label>
              <input
                name="name"
                required
                maxLength={100}
                placeholder="Free coffee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                name="description"
                maxLength={300}
                placeholder="One free drip coffee of any size"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Points required *</label>
              <input
                name="points_required"
                type="number"
                min={1}
                required
                placeholder="500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Create reward
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
