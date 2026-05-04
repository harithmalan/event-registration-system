import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import { supabaseAdmin } from '@/lib/supabase-server'


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

const { data: adminProfile } = await supabaseAdmin
  .from('profiles').select('is_admin').eq('id', session.user.id).single()
  if (!adminProfile?.is_admin) redirect('/dashboard')

  // Test 1 — fetch registrations with no join
const { data: registrations } = await supabaseAdmin
  .from('registrations')
  .select('*')
  .order('uploaded_at', { ascending: false })
const { data: profiles } = await supabaseAdmin
  .from('profiles')
  .select('id, full_name, student_number, email, avatar_initial')
console.log('REGISTRATIONS:', JSON.stringify(registrations, null, 2))
console.log('ERROR:', JSON.stringify(Error, Object.getOwnPropertyNames(Error ?? {})))
const rows = await Promise.all(
  (registrations ?? []).map(async (row) => {
    const profile = (profiles ?? []).find(p => p.id === row.user_id) ?? null

    // Generate signed URL for receipt
    let receiptUrl = row.receipt_url
    if (receiptUrl) {
      const path = receiptUrl.split('/receipts/')[1]
      if (path) {
        const { data: signed } = await supabaseAdmin.storage
          .from('receipts')
          .createSignedUrl(path, 60 * 60)
        receiptUrl = signed?.signedUrl ?? receiptUrl
      }
    }

    return {
      ...row,
      receipt_url: receiptUrl,
      profiles: profile ? {
        full_name: profile.full_name,
        student_number: profile.student_number,
        email: profile.email,
        avatar_initial: profile.avatar_initial,
      } : null
    }
  })
) as RegistrationRow[]

const stats = {
  total: rows.length,
  pending: rows.filter(r => r.receipt_status === 'pending').length,
  approved: rows.filter(r => r.receipt_status === 'approved').length,
  rejected: rows.filter(r => r.receipt_status === 'rejected').length,
}

return <AdminClient initialData={rows} stats={stats} />
}
