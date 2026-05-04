import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

interface RegistrationRow {
  id: string
  user_id: string
  receipt_url: string | null
  receipt_status: string
  rejection_reason: string | null
  qr_token: string | null
  qr_used: boolean
  email_sent: boolean
  uploaded_at: string | null
  reviewed_at: string | null
  profiles: {
    full_name: string
    student_number: string
    email: string
    avatar_initial: string | null
  } | null
}

export default async function AdminPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles').select('is_admin').eq('id', session.user.id).single()
  if (!adminProfile?.is_admin) redirect('/dashboard')

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, profiles(full_name, student_number, email, avatar_initial)')
    .order('uploaded_at', { ascending: false })

  const rows = (registrations ?? []) as RegistrationRow[]

  const stats = {
    total: rows.length,
    pending: rows.filter(r => r.receipt_status === 'pending').length,
    approved: rows.filter(r => r.receipt_status === 'approved').length,
    rejected: rows.filter(r => r.receipt_status === 'rejected').length,
  }

  return <AdminClient initialData={rows} stats={stats} />
}
