import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/ui/Navbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?redirectedFrom=/admin')

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role !== 'admin') redirect('/')

  return (
    <>
      <Navbar section="Admin" homeHref="/admin" />
      {children}
    </>
  )
}
