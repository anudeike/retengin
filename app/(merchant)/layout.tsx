import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?redirectedFrom=/dashboard')
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role !== 'merchant') {
    redirect('/')
  }

  return <>{children}</>
}
