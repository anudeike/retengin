import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { CorrectionForm } from '@/components/admin/CorrectionForm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function AdminCorrectionsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, business_name')
    .order('business_name', { ascending: true })

  const { data: corrections } = await supabase
    .from('point_transactions')
    .select('id, points, balance_after, note, created_at, customers(email), merchants(business_name)')
    .eq('transaction_type', 'admin_correction')
    .order('created_at', { ascending: false })
    .limit(50)

  async function applyCorrection(data: {
    merchantId: string
    customerEmail: string
    delta: number
    note: string
  }): Promise<{ error?: string }> {
    'use server'
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/correct-points`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: data.merchantId,
          customerEmail: data.customerEmail,
          delta: data.delta,
          note: data.note,
        }),
      },
    )
    if (!res.ok) {
      const body = await res.json()
      return { error: body.error ?? 'Failed' }
    }
    return {}
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/admin">← Admin</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Point Corrections</h1>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold mb-4">Apply Correction</h2>
            <CorrectionForm
              merchants={(merchants ?? []).map((m) => ({ id: m.id, business_name: m.business_name }))}
              onSubmit={applyCorrection}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Correction Log
            </h2>
            {(corrections ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No corrections yet.</p>
            ) : (
              <ul className="divide-y">
                {(corrections ?? []).map((c) => {
                  const customer = c.customers as unknown as { email: string } | null
                  const merchant = c.merchants as unknown as { business_name: string } | null
                  return (
                    <li key={c.id} className="py-3">
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{customer?.email ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{merchant?.business_name}</p>
                          {c.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{c.note}</p>}
                        </div>
                        <div className="text-right ml-4">
                          <p className={`font-bold ${c.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {c.points > 0 ? '+' : ''}{c.points} pts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
