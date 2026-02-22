import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function AdminOverviewPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { count: merchantCount } = await supabase
    .from('merchants')
    .select('id', { count: 'exact', head: true })

  const { count: customerCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })

  const { count: txCount } = await supabase
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_type', 'earned')

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-bold">System Overview</h1>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Merchants</p>
              <p className="text-3xl font-bold">{merchantCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Customers</p>
              <p className="text-3xl font-bold">{customerCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Txns (earned)</p>
              <p className="text-3xl font-bold">{txCount ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/admin/merchants', label: 'Merchants' },
            { href: '/admin/merchants/new', label: 'Onboard Merchant' },
            { href: '/admin/customers', label: 'Customers' },
            { href: '/admin/corrections', label: 'Corrections' },
          ].map(({ href, label }) => (
            <Button key={href} variant="outline" asChild className="h-auto py-4">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </main>
  )
}
