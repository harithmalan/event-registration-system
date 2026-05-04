import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const cookieStore = cookies()
  const response = NextResponse.redirect(`${origin}/dashboard`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !session) {
    console.error('Auth error:', error)
    return NextResponse.redirect(`${origin}/login`)
  }

  // Use admin to check profile
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('student_number')
    .eq('id', session.user.id)
    .maybeSingle()

  // No student number → go to profile setup
  if (!profile?.student_number || profile.student_number.trim() === '') {
    const setupResponse = NextResponse.redirect(`${origin}/profile-setup`)
    // Copy cookies to the new response so session is preserved
    response.cookies.getAll().forEach(cookie => {
      setupResponse.cookies.set(cookie)
    })
    return setupResponse
  }

  return response
}