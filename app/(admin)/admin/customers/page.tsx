import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  let query = supabase
    .from('customers')
    .select('id, email, display_name, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    query = query.ilike('email', `%${q}%`)
  }

  const { data: customers } = await query

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold mb-6">Customers</h1>

        {/* Search */}
        <form method="GET" className="mb-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by email..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </form>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(customers ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                      {c.email}
                    </Link>
                    {c.display_name && <p className="text-xs text-gray-400">{c.display_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(customers ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
