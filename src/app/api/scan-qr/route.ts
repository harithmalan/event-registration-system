import { supabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ valid: false, message: 'No token provided' })

    const normalizedToken = String(token).trim().replace(/\/$/, '').split('/verify/').pop()
    if (!normalizedToken) return NextResponse.json({ valid: false, message: 'No token provided' })

    const { data: reg, error } = await supabaseAdmin
      .from('registrations')
      .select('id, qr_used, qr_used_at, profiles:profiles!registrations_user_id_fkey(full_name, student_number)')
      .eq('qr_token', normalizedToken)
      .maybeSingle()

    if (error) {
      console.error('QR scan lookup failed:', error)
    }

    if (!reg) return NextResponse.json({ valid: false, message: 'Invalid QR code' })
    if (reg.qr_used) return NextResponse.json({
      valid: false,
      message: 'QR already used',
      usedAt: reg.qr_used_at,
    })

    await supabaseAdmin.from('registrations').update({
      qr_used: true,
      qr_used_at: new Date().toISOString(),
    }).eq('id', reg.id)

    return NextResponse.json({
      valid: true,
      message: 'Access granted',
      student: reg.profiles,
    })
  } catch {
    return NextResponse.json({ valid: false, message: 'Server error' }, { status: 500 })
  }
}
