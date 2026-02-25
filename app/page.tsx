import Link from 'next/link'
import { Button } from '@/components/ui/button'

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:    'Your sign-in link has expired or has already been used. Please request a new one.',
  missing_code:   'The sign-in link was invalid or opened in the wrong browser. Please request a new one.',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Please try signing in again.') : null

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Taplo</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        A universal loyalty network — earn points at every small business you love.
      </p>

      {errorMessage && (
        <div className="mb-6 max-w-sm w-full rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive text-left">
          {errorMessage}
        </div>
      )}

      <Button asChild size="lg">
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  )
}
