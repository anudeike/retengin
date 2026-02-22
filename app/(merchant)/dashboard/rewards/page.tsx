import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
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
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        {r.description && <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="font-bold">{r.points_required.toLocaleString()} pts</p>
                        <span className={`text-xs ${r.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
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
