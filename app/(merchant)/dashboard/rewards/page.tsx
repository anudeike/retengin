import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function MerchantRewardsPage() {
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

  const { data: rewards } = await supabase
    .from('rewards')
    .select('id, name, description, points_required, is_active')
    .eq('merchant_id', merchant.id)
    .order('points_required', { ascending: true })

  async function toggleActive(formData: FormData) {
    'use server'
    const rewardId = formData.get('rewardId') as string
    const currentActive = formData.get('is_active') === 'true'

    const service = createServiceRoleClient()
    await service
      .from('rewards')
      .update({ is_active: !currentActive })
      .eq('id', rewardId)
      .eq('merchant_id', merchant!.id)

    redirect('/dashboard/rewards')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Rewards</h1>
          <Button asChild size="sm">
            <Link href="/dashboard/rewards/new">+ New reward</Link>
          </Button>
        </div>

        {(rewards ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p className="text-3xl mb-2">🎁</p>
              <p>No rewards yet. Create your first reward to give customers something to work toward.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {(rewards ?? []).map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r.name}</p>
                        {r.description && <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 space-y-2">
                        <p className="font-bold">{r.points_required.toLocaleString()} pts</p>
                        <div className="flex items-center gap-2 justify-end">
                          <form action={toggleActive}>
                            <input type="hidden" name="rewardId" value={r.id} />
                            <input type="hidden" name="is_active" value={String(r.is_active)} />
                            <button
                              type="submit"
                              className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                                r.is_active
                                  ? 'border-green-600 text-green-600 hover:bg-green-50'
                                  : 'border-muted-foreground text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {r.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </form>
                          <Link
                            href={`/dashboard/rewards/${r.id}/edit`}
                            className="text-xs text-muted-foreground underline hover:text-foreground"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
