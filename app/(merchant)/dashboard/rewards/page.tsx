import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Dashboard
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Rewards</h1>
          <Link
            href="/dashboard/rewards/new"
            className="px-4 py-2 bg-black text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition"
          >
            + New reward
          </Link>
        </div>

        {(rewards ?? []).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">🎁</p>
            <p>No rewards yet. Create your first reward to give customers something to work toward.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(rewards ?? []).map((r) => (
              <li key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    {r.description && <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="font-bold">{r.points_required.toLocaleString()} pts</p>
                    <span className={`text-xs ${r.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
