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

  const { registrationId, studentEmail, studentName } = await req.json()
  const qrToken = crypto.randomUUID()

  const { error: updateError } = await supabaseAdmin.from('registrations').update({
    receipt_status: 'approved',
    qr_token: qrToken,
    reviewed_at: new Date().toISOString(),
    reviewed_by: session.user.id,
  }).eq('id', registrationId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  try {
    const origin = new URL(req.url).origin
    const emailRes = await fetch(`${origin}/api/send-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentEmail, studentName, qrToken }),
    })

    if (emailRes.ok) {
      await supabaseAdmin.from('registrations')
        .update({ email_sent: true }).eq('id', registrationId)
    }
  } catch (err) {
    console.error('Failed to send invite email:', err)
  }

  return NextResponse.json({ success: true, qrToken })
}
