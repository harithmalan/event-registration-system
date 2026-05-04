import { supabaseAdmin } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
}

export async function POST(req: Request) {
  const supabase = makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', session.user.id).single()
  if (!adminProfile?.is_admin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { registrationId } = await req.json()

  const { error } = await supabaseAdmin.from('registrations').update({
    receipt_status: 'pending',
    rejection_reason: null,
    reviewed_at: null,
    reviewed_by: null,
  }).eq('id', registrationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
