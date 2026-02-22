import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/ui/Navbar'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?redirectedFrom=/wallet')

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role && roleRow.role !== 'customer') redirect('/')

  return (
    <>
      <Navbar section="Wallet" homeHref="/wallet" />
      {children}
    </>
  )
}
