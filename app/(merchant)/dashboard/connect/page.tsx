import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConnectSquareButton } from './ConnectSquareButton'

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function SquareConnectPage({ searchParams }: Props) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, square_merchant_id, square_token_expires_at, status')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const params = await searchParams
  const isConnected = !!merchant?.square_merchant_id

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold mb-6">Square Connection</h1>

        {params.success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Successfully connected to Square!
          </div>
        )}
        {params.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            Error: {params.error.replace(/_/g, ' ')}
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            {isConnected ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="font-medium text-green-700">Connected to Square</span>
                </div>
                <p className="text-sm text-muted-foreground">Merchant ID: {merchant.square_merchant_id}</p>
                {merchant.square_token_expires_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Token expires:{' '}
                    {new Date(merchant.square_token_expires_at).toLocaleDateString()}
                  </p>
                )}
                <div className="mt-5 pt-5 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Need to reconnect? Re-authorize below to refresh your tokens.
                  </p>
                  <ConnectSquareButton isConnected={true} />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 inline-block" />
                  <span className="font-medium text-muted-foreground">Not connected</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Connect your Square account so Taplo can automatically award points when customers
                  make purchases.
                </p>
                <ConnectSquareButton isConnected={false} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
