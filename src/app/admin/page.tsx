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

interface AdminProfileRow {
  id: string
  full_name: string | null
  student_number: string | null
  email: string | null
  avatar_initial: string | null
  avatar_url: string | null
  is_admin: boolean | null
}

interface KumaraAdminRow {
  id: string
  user_id: string
  full_name: string
  age: number
  gender: 'kumara' | 'kumariya'
  batch: string
  photo_url: string | null
  skill: string | null
  email_sent: boolean | null
  registered_at: string
}

interface TugMemberProfile {
  id: string
  full_name: string | null
  avatar_initial: string | null
  avatar_url: string | null
}

interface TugMemberRow {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profiles: TugMemberProfile | null
}

interface RawTugMemberRow {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profiles: TugMemberProfile | TugMemberProfile[] | null
}

interface TugGroupRow {
  id: string
  name: string
  created_by: string
  member_count: number
  max_members: number
  created_at: string
  members: TugMemberRow[]
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
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  if (!adminProfile?.is_admin) redirect('/dashboard')

  const [
    { data: registrations },
    { data: profiles },
    { data: kumaraRows },
    { data: tugGroupsData },
    { data: tugMembersData },
  ] = await Promise.all([
    supabaseAdmin
      .from('registrations')
      .select('*')
      .order('uploaded_at', { ascending: false }),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, student_number, email, avatar_initial, avatar_url, is_admin'),
    supabaseAdmin
      .from('game_kumara_kumariya')
      .select('*')
      .order('registered_at', { ascending: false }),
    supabaseAdmin
      .from('tug_of_war_groups')
      .select('id, name, created_by, member_count, max_members, created_at')
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('tug_of_war_members')
      .select(`
        id,
        group_id,
        user_id,
        joined_at,
        profiles:profiles!tug_of_war_members_user_id_fkey (
          id,
          full_name,
          avatar_initial,
          avatar_url
        )
      `),
  ])

  const rows = await Promise.all(
    (registrations ?? []).map(async (row) => {
      const profile = (profiles ?? []).find((item) => item.id === row.user_id) ?? null

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

  const tugMembers = ((tugMembersData ?? []) as RawTugMemberRow[]).map((member) => ({
    ...member,
    profiles: Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles ?? null,
  })) as TugMemberRow[]
  const groupedMembers = new Map<string, TugMemberRow[]>()

  tugMembers.forEach((member) => {
    if (!groupedMembers.has(member.group_id)) groupedMembers.set(member.group_id, [])
    groupedMembers.get(member.group_id)?.push(member)
  })

  const tugGroups = ((tugGroupsData ?? []) as Omit<TugGroupRow, 'members'>[]).map((group) => ({
    ...group,
    members: (groupedMembers.get(group.id) ?? []).sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
  }))

  const stats = {
    total: rows.length,
    pending: rows.filter((row) => row.receipt_status === 'pending').length,
    approved: rows.filter((row) => row.receipt_status === 'approved').length,
    rejected: rows.filter((row) => row.receipt_status === 'rejected').length,
  }

  return (
    <AdminClient
      initialData={rows}
      initialProfiles={(profiles ?? []) as AdminProfileRow[]}
      stats={stats}
      initialKumaraRows={(kumaraRows ?? []) as KumaraAdminRow[]}
      initialTugGroups={tugGroups}
    />
  )
}
