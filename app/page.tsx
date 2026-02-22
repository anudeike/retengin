import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Taplo</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        A universal loyalty network — earn points at every small business you love.
      </p>
      <Button asChild size="lg">
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  )
}
