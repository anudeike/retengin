import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  merchantId: z.string().uuid(),
  customerEmail: z.string().email(),
  delta: z.number().int().refine((n) => n !== 0, 'delta cannot be zero'),
  note: z.string().min(1),
})

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { merchantId, customerEmail, delta, note } = parsed.data

  const service = createServiceRoleClient()

  // Resolve customer by email
  const { data: customer } = await service
    .from('customers')
    .select('id')
    .eq('email', customerEmail.toLowerCase())
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const { error } = await service.rpc('admin_correct_points', {
    p_customer_id: customer.id,
    p_merchant_id: merchantId,
    p_delta: delta,
    p_note: note,
  })

  if (error) {
    console.error('[admin/correct-points] RPC error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
