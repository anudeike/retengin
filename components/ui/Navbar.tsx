'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface NavbarProps {
  section: string
  homeHref: string
}

export function Navbar({ section, homeHref }: NavbarProps) {
  const router = useRouter()

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href={homeHref} className="font-bold text-lg tracking-tight">
          Taplo
        </Link>
        <span className="text-sm text-muted-foreground">{section}</span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <Separator />
    </header>
  )
}
