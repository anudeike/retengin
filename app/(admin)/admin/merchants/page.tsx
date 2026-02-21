import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { MerchantStatusBadge } from '@/components/admin/MerchantStatusBadge'
import type { Enums } from '@/types/database.types'

export default async function AdminMerchantsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, business_name, slug, status, contact_email, square_merchant_id, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-black mb-6 inline-block">
          ← Admin
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Merchants ({(merchants ?? []).length})</h1>
          <Link
            href="/admin/merchants/new"
            className="px-4 py-2 bg-black text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition"
          >
            + Onboard
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Square</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(merchants ?? []).map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/admin/merchants/${m.id}`} className="font-medium hover:underline">
                      {m.business_name}
                    </Link>
                    <p className="text-xs text-gray-400">{m.contact_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <MerchantStatusBadge status={m.status as Enums<'merchant_status'>} />
                  </td>
                  <td className="px-4 py-3">
                    {m.square_merchant_id ? (
                      <span className="text-green-600 text-xs">✓ connected</span>
                    ) : (
                      <span className="text-gray-400 text-xs">not connected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
