import { supabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ valid: false, message: 'No token provided' })

    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('id, qr_used, qr_used_at, profiles(full_name, student_number)')
      .eq('qr_token', token)
      .single()

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
