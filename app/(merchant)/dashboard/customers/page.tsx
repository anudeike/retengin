import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { CustomerTable } from '@/components/merchant/CustomerTable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function MerchantCustomersPage() {
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

  const { data: balances } = await supabase
    .from('customer_merchant_balances')
    .select('customer_id, balance, customers(email, display_name)')
    .eq('merchant_id', merchant.id)
    .order('balance', { ascending: false })

  const customers = (balances ?? []).map((b) => {
    const c = b.customers as unknown as { email: string; display_name: string | null } | null
    return {
      customer_id: b.customer_id,
      email: c?.email ?? '—',
      display_name: c?.display_name ?? null,
      balance: b.balance,
    }
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">
          Customers <span className="text-muted-foreground font-normal text-lg">({customers.length})</span>
        </h1>

        <Card>
          <CardContent className="p-5">
            <CustomerTable customers={customers} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
