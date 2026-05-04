import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !session) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login`)
    }

    // Use admin client to reliably check profile
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('student_number')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!profile?.student_number || profile.student_number.trim() === '') {
      return NextResponse.redirect(`${origin}/profile-setup`)
    }

    return NextResponse.redirect(`${origin}/dashboard`)

  } catch (err) {
    console.error('Callback exception:', err)
    return NextResponse.redirect(`${origin}/login`)
  }
}