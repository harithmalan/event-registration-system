'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Trophy,
  Users,
  X,
  XCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase-browser'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type ReceiptStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

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
  profiles: { full_name: string; student_number: string; email: string; avatar_initial: string | null } | null
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

interface AdminProfileViewRow extends AdminProfileRow {
  registrationStatus: ReceiptStatus
  qrState: 'not_sent' | 'sent' | 'used'
  uploaded_at: string | null
}

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
}

interface KumaraAdminRow {
  id: string
  user_id: string
  full_name: string
  age: number
  gender: 'kumara' | 'kumariya'
  batch: string
  photo_url: string | null
  photo_preview_url?: string | null
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

type AdminSection = 'registrations' | 'profiles' | 'games'
type ProfileRoleFilter = 'all' | 'admins' | 'students'

function AnimatedCount({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let current = 0
    const steps = 18
    const increment = Math.max(1, Math.ceil(value / steps))
    const interval = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(interval)
      } else {
        setDisplayValue(current)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [value])

  return <>{displayValue}</>
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return <p className="rounded-xl border border-[#8B1A1A]/20 bg-[#8B1A1A]/8 px-3 py-2 text-xs text-[#8B1A1A]">{message}</p>
}

function SuccessBanner({ message }: { message: string }) {
  if (!message) return null
  return <p className="rounded-xl border border-[#2D7A3A]/20 bg-[#2D7A3A]/8 px-3 py-2 text-xs text-[#2D7A3A]">{message}</p>
}

export default function AdminClient({
  initialData,
  initialProfiles,
  stats,
  initialKumaraRows,
  initialTugGroups,
}: {
  initialData: RegistrationRow[]
  initialProfiles: AdminProfileRow[]
  stats: Stats
  initialKumaraRows: KumaraAdminRow[]
  initialTugGroups: TugGroupRow[]
}) {
  const supabase = useMemo(() => createBrowserClient(), [])

  const [rows, setRows] = useState<RegistrationRow[]>(initialData)
  const [filterStatus, setFilterStatus] = useState<'all' | ReceiptStatus>('all')
  const [filterQR, setFilterQR] = useState<'all' | 'sent' | 'used'>('all')
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [flashApproveId, setFlashApproveId] = useState<string | null>(null)
  const [rejectModalId, setRejectModalId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [receiptModal, setReceiptModal] = useState<string | null>(null)
  const [gamePhotoModal, setGamePhotoModal] = useState<{ url: string; name: string } | null>(null)
  const [activeSection, setActiveSection] = useState<AdminSection>('registrations')
  const [rejectAnimating, setRejectAnimating] = useState(false)
  const [reminderSending, setReminderSending] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [profileRoleFilter, setProfileRoleFilter] = useState<ProfileRoleFilter>('all')

  const [kumaraRows, setKumaraRows] = useState<KumaraAdminRow[]>(initialKumaraRows)
  const [tugGroups, setTugGroups] = useState<TugGroupRow[]>(initialTugGroups)
  const [gamesBusyId, setGamesBusyId] = useState<string | null>(null)
  const [gamesError, setGamesError] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filterStatus !== 'all' && row.receipt_status !== filterStatus) return false
      if (filterQR === 'sent' && !(row.qr_token && !row.qr_used)) return false
      if (filterQR === 'used' && !row.qr_used) return false
      if (search) {
        const query = search.toLowerCase()
        const name = row.profiles?.full_name?.toLowerCase() ?? ''
        const studentNumber = row.profiles?.student_number?.toLowerCase() ?? ''
        const email = row.profiles?.email?.toLowerCase() ?? ''
        if (!name.includes(query) && !studentNumber.includes(query) && !email.includes(query)) return false
      }
      return true
    })
  }, [filterQR, filterStatus, rows, search])

  const registrationByUserId = useMemo(() => {
    const registrations = new Map<string, RegistrationRow>()

    rows.forEach((row) => {
      if (!registrations.has(row.user_id)) registrations.set(row.user_id, row)
    })

    return registrations
  }, [rows])

  const allProfiles = useMemo<AdminProfileViewRow[]>(() => {
    return initialProfiles
      .map((profile) => {
        const registration = registrationByUserId.get(profile.id)

        return {
          ...profile,
          registrationStatus: (registration?.receipt_status as ReceiptStatus) ?? 'not_submitted',
          qrState: registration?.qr_used ? 'used' : registration?.qr_token ? 'sent' : 'not_sent',
          uploaded_at: registration?.uploaded_at ?? null,
        }
      })
      .sort((a, b) => {
        const adminDiff = Number(b.is_admin === true) - Number(a.is_admin === true)
        if (adminDiff !== 0) return adminDiff

        const aLabel = a.full_name?.trim() || a.email?.trim() || a.id
        const bLabel = b.full_name?.trim() || b.email?.trim() || b.id
        return aLabel.localeCompare(bLabel)
      })
  }, [initialProfiles, registrationByUserId])

  const filteredProfiles = useMemo(() => {
    return allProfiles.filter((profile) => {
      if (profileRoleFilter === 'admins' && !profile.is_admin) return false
      if (profileRoleFilter === 'students' && profile.is_admin) return false

      if (profileSearch) {
        const query = profileSearch.toLowerCase()
        const name = profile.full_name?.toLowerCase() ?? ''
        const studentNumber = profile.student_number?.toLowerCase() ?? ''
        const email = profile.email?.toLowerCase() ?? ''
        if (!name.includes(query) && !studentNumber.includes(query) && !email.includes(query)) return false
      }

      return true
    })
  }, [allProfiles, profileRoleFilter, profileSearch])

  const profileStats = useMemo(() => {
    return {
      total: allProfiles.length,
      admins: allProfiles.filter((profile) => profile.is_admin).length,
      completed: allProfiles.filter((profile) => profile.student_number?.trim()).length,
      approved: allProfiles.filter((profile) => profile.registrationStatus === 'approved').length,
    }
  }, [allProfiles])

  const parseStoragePath = useCallback((value: string | null) => {
    if (!value) return null
    if (value.startsWith('http')) {
      const marker = '/game-photos/'
      const index = value.indexOf(marker)
      return index >= 0 ? value.slice(index + marker.length) : value
    }
    return value
  }, [])

  const hydrateKumaraPhotos = useCallback(async (items: KumaraAdminRow[]) => {
    const hydrated = await Promise.all(items.map(async (row) => {
      const path = parseStoragePath(row.photo_url)
      if (!path) return { ...row, photo_preview_url: null }

      const { data } = await supabase.storage.from('game-photos').createSignedUrl(path, 60 * 60)
      return { ...row, photo_preview_url: data?.signedUrl ?? null }
    }))

    setKumaraRows(hydrated)
  }, [parseStoragePath, supabase])

  const loadGamesAdminData = useCallback(async () => {
    const [{ data: kumaraData }, { data: groupsData }, { data: membersData }] = await Promise.all([
      supabase
        .from('game_kumara_kumariya')
        .select('*')
        .order('registered_at', { ascending: false }),
      supabase
        .from('tug_of_war_groups')
        .select('id, name, created_by, member_count, max_members, created_at')
        .order('created_at', { ascending: true }),
      supabase
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

    const members = ((membersData ?? []) as RawTugMemberRow[]).map((member) => ({
      ...member,
      profiles: Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles ?? null,
    })) as TugMemberRow[]
    const grouped = new Map<string, TugMemberRow[]>()
    members.forEach((member) => {
      if (!grouped.has(member.group_id)) grouped.set(member.group_id, [])
      grouped.get(member.group_id)?.push(member)
    })

    setTugGroups(((groupsData ?? []) as Omit<TugGroupRow, 'members'>[]).map((group) => ({
      ...group,
      members: (grouped.get(group.id) ?? []).sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
    })))

    await hydrateKumaraPhotos((kumaraData ?? []) as KumaraAdminRow[])
  }, [hydrateKumaraPhotos, supabase])

  useEffect(() => {
    hydrateKumaraPhotos(initialKumaraRows)
  }, [hydrateKumaraPhotos, initialKumaraRows])

  async function handleApprove(row: RegistrationRow) {
    setLoadingId(row.id)
    setGamesError('')

    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: row.id,
          userId: row.user_id,
          studentEmail: row.profiles?.email,
          studentName: row.profiles?.full_name,
        }),
      })

      if (!res.ok) throw new Error('Approve failed')

      const { qrToken } = await res.json()
      setFlashApproveId(row.id)
      setTimeout(() => {
        setRows((prev) => prev.map((item) => (
          item.id === row.id
            ? { ...item, receipt_status: 'approved', qr_token: qrToken, email_sent: true }
            : item
        )))
        setFlashApproveId(null)
      }, 450)
    } finally {
      setLoadingId(null)
    }
  }

  async function handleReject() {
    if (!rejectModalId) return
    const row = rows.find((item) => item.id === rejectModalId)
    if (!row) return

    setLoadingId(rejectModalId)
    setRejectAnimating(true)

    try {
      await fetch('/api/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: row.id,
          userId: row.user_id,
          studentEmail: row.profiles?.email,
          studentName: row.profiles?.full_name,
          reason: rejectReason,
        }),
      })

      setRows((prev) => prev.map((item) => (
        item.id === rejectModalId
          ? { ...item, receipt_status: 'rejected', rejection_reason: rejectReason }
          : item
      )))
    } finally {
      setLoadingId(null)
      setRejectModalId(null)
      setRejectReason('')
      setTimeout(() => setRejectAnimating(false), 450)
    }
  }

  async function handleSendEmail(row: RegistrationRow) {
    setLoadingId(row.id)
    try {
      await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: row.profiles?.email, studentName: row.profiles?.full_name, qrToken: row.qr_token }),
      })
      setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, email_sent: true } : item))
    } finally {
      setLoadingId(null)
    }
  }

  async function handleReReview(row: RegistrationRow) {
    setLoadingId(row.id)
    try {
      const res = await fetch('/api/re-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: row.id }),
      })
      if (res.ok) setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, receipt_status: 'pending' } : item))
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDeleteKumara(id: string) {
    setGamesBusyId(id)
    setGamesError('')
    try {
      const { error } = await supabase
        .from('game_kumara_kumariya')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
      setKumaraRows((prev) => prev.filter((row) => row.id !== id))
    } catch (error) {
      setGamesError(error instanceof Error ? error.message : 'Could not delete registration.')
    } finally {
      setGamesBusyId(null)
    }
  }

  async function handleDeleteGroup(id: string) {
    setGamesBusyId(id)
    setGamesError('')
    try {
      const { error } = await supabase
        .from('tug_of_war_groups')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
      setTugGroups((prev) => prev.filter((group) => group.id !== id))
    } catch (error) {
      setGamesError(error instanceof Error ? error.message : 'Could not delete group.')
    } finally {
      setGamesBusyId(null)
    }
  }

  async function handleSaveGroupName(groupId: string) {
    if (!editingGroupName.trim()) {
      setGamesError('Group name cannot be empty.')
      return
    }

    setGamesBusyId(groupId)
    setGamesError('')
    try {
      const { error } = await supabase
        .from('tug_of_war_groups')
        .update({ name: editingGroupName.trim() })
        .eq('id', groupId)
      if (error) throw new Error(error.message)
      setTugGroups((prev) => prev.map((group) => group.id === groupId ? { ...group, name: editingGroupName.trim() } : group))
      setEditingGroupId(null)
      setEditingGroupName('')
    } catch (error) {
      setGamesError(error instanceof Error ? error.message : 'Could not update group name.')
    } finally {
      setGamesBusyId(null)
    }
  }

  async function handleRemoveMember(memberId: string) {
    setGamesBusyId(memberId)
    setGamesError('')
    try {
      const { error } = await supabase
        .from('tug_of_war_members')
        .delete()
        .eq('id', memberId)
      if (error) throw new Error(error.message)
      await loadGamesAdminData()
    } catch (error) {
      setGamesError(error instanceof Error ? error.message : 'Could not remove member.')
    } finally {
      setGamesBusyId(null)
    }
  }

  async function handleMoveMember(memberId: string, targetGroupId: string) {
    if (!targetGroupId) {
      setGamesError('Select a target group first.')
      return
    }

    setGamesBusyId(memberId)
    setGamesError('')
    try {
      const res = await fetch('/api/games/move-tug-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, targetGroupId }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Move failed' }))
        throw new Error(payload.error || 'Move failed')
      }

      setMoveTargets((prev) => ({ ...prev, [memberId]: '' }))
      await loadGamesAdminData()
    } catch (error) {
      setGamesError(error instanceof Error ? error.message : 'Could not move member.')
    } finally {
      setGamesBusyId(null)
    }
  }

  async function handleSendPaymentReminders() {
    setReminderSending(true)
    setReminderMessage('')
    setGamesError('')

    try {
      const response = await fetch('/api/send-payment-reminders', {
        method: 'POST',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not send payment reminders.')
      }

      setReminderMessage(`Reminder emails sent to ${payload?.sent ?? 0} student(s).`)
    } catch (error) {
      setGamesError(error instanceof Error ? error.message : 'Could not send payment reminders.')
    } finally {
      setReminderSending(false)
    }
  }

  const tabs: Array<{ key: 'all' | ReceiptStatus; label: string; count?: number }> = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.rejected },
  ]

  const profileTabs: Array<{ key: ProfileRoleFilter; label: string; count: number }> = [
    { key: 'all', label: 'All Profiles', count: profileStats.total },
    { key: 'students', label: 'Students', count: profileStats.total - profileStats.admins },
    { key: 'admins', label: 'Admins', count: profileStats.admins },
  ]

  const qrBadge = (row: RegistrationRow) => {
    if (row.qr_used) return <span className="inline-flex items-center gap-1 rounded-full border border-[#2D7A3A]/25 bg-[#2D7A3A]/10 px-2 py-0.5 text-[0.68rem] font-semibold text-[#2D7A3A]">Used</span>
    if (row.qr_token) return <span className="inline-flex items-center gap-1 rounded-full border border-[#3A7ABD]/25 bg-[#3A7ABD]/10 px-2 py-0.5 text-[0.68rem] font-semibold text-[#2A5F99]">Sent</span>
    return <span className="inline-flex items-center gap-1 rounded-full border border-[#9C7D5A]/20 bg-[#9C7D5A]/10 px-2 py-0.5 text-[0.68rem] font-semibold text-[#9C7D5A]">Not Sent</span>
  }

  const exportToCSV = (data: KumaraAdminRow[]) => {
    const headers = ['Name', 'Age', 'Gender', 'Batch', 'Skill', 'Registered At']
    const rowsToExport = data.map((row) => [row.full_name, row.age, row.gender, row.batch, row.skill ?? '', row.registered_at])
    const csv = [headers, ...rowsToExport].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'kumara-kumariya-registrations.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-6">
      <div className="mb-5">
        <h1 className="font-yatra text-2xl text-[#7A1F28]">Admin Panel</h1>
        <p className="text-sm text-[#9C7D5A]">Manage registrations for Awurudu 2026 - BMICH Hidden Escape, 8th May 2026</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { key: 'registrations', label: 'Registrations' },
          { key: 'profiles', label: 'User Profiles' },
          { key: 'games', label: 'Games' },
        ].map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key as AdminSection)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
              activeSection === section.key
                ? 'bg-[#7A1F28] text-[#F5E4B8] shadow-lg'
                : 'border border-[#EEE2C8] bg-white text-[#5C3D2E] hover:border-[#C9943A] hover:bg-[#FAF3E0]'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'registrations' && (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[rgba(201,148,58,0.1)] bg-white p-4 shadow-[0_4px_24px_rgba(122,31,40,0.08)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#7A1F28]">Payment Reminder Emails</p>
              <p className="text-xs text-[#9C7D5A]">Notify students who still need to buy tickets or upload a valid receipt before the closing window.</p>
            </div>
            <button
              onClick={handleSendPaymentReminders}
              disabled={reminderSending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F28] px-4 py-2.5 text-sm font-semibold text-[#F5E4B8] transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
            >
              {reminderSending ? <LoadingSpinner size={14} color="#F5E4B8" /> : <Send size={14} />}
              {reminderSending ? 'Sending...' : 'Send Payment Reminders'}
            </button>
          </div>
          <div className="mb-4 space-y-2">
            <SuccessBanner message={reminderMessage} />
            <ErrorBanner message={gamesError} />
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: <Users size={18} />, label: 'Total', value: stats.total, accent: '#C9943A' },
              { icon: <Clock size={18} />, label: 'Pending', value: stats.pending, accent: '#8B6914' },
              { icon: <CheckCircle2 size={18} />, label: 'Approved', value: stats.approved, accent: '#2D7A3A' },
              { icon: <XCircle size={18} />, label: 'Rejected', value: stats.rejected, accent: '#8B1A1A' },
            ].map(({ icon, label, value, accent }) => (
              <div key={label} className="festival-card-hover rounded-2xl border border-[rgba(201,148,58,0.1)] bg-white p-4 shadow-[0_4px_24px_rgba(122,31,40,0.08)]" style={{ borderTop: `3px solid ${accent}` }}>
                <div className="mb-1 flex items-center gap-2" style={{ color: accent }}>
                  {icon}
                  <span className="text-[0.72rem] uppercase tracking-wider text-[#9C7D5A]">{label}</span>
                </div>
                <div className="font-yatra text-3xl text-[#7A1F28]"><AnimatedCount value={value} /></div>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(201,148,58,0.1)] bg-white px-4 py-3 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${filterStatus === tab.key ? 'text-[#F5E4B8]' : 'text-[#5C3D2E] hover:bg-[#FAF3E0]'}`}
                  style={filterStatus === tab.key ? { background: 'linear-gradient(135deg, #7A1F28, #4E1219)' } : {}}
                >
                  {tab.label} {tab.count !== undefined && <span className="ml-1 opacity-70">({tab.count})</span>}
                </button>
              ))}
            </div>
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
              <input
                id="admin-search"
                type="text"
                placeholder="Search by name, student no, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#EEE2C8] bg-[#FAF3E0] py-1.5 pl-8 pr-3 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#C9943A]"
              />
            </div>
            <select
              value={filterQR}
              onChange={(e) => setFilterQR(e.target.value as 'all' | 'sent' | 'used')}
              className="rounded-lg border border-[#EEE2C8] bg-[#FAF3E0] px-3 py-1.5 text-sm text-[#2B1A0E] outline-none focus:border-[#C9943A]"
            >
              <option value="all">All QR Status</option>
              <option value="sent">QR Sent</option>
              <option value="used">QR Used</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[rgba(201,148,58,0.1)] bg-white shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}>
                  <tr>
                    {['Student', 'Email', 'Uploaded', 'Receipt', 'Status', 'QR', 'Actions'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-[0.7rem] font-bold uppercase tracking-wider text-[#F5E4B8]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-[#9C7D5A]">No registrations found.</td></tr>
                  ) : filtered.map((row, index) => (
                    <tr
                      key={row.id}
                      className="festival-entrance border-b border-[#EEE2C8] transition-colors hover:bg-[rgba(201,148,58,0.03)]"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#E8BC6A] text-xs font-bold" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                            {row.profiles?.avatar_initial ?? row.profiles?.full_name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#2B1A0E]">{row.profiles?.full_name ?? '-'}</p>
                            <p className="text-xs text-[#9C7D5A]">{row.profiles?.student_number ?? '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5C3D2E]">{row.profiles?.email ?? '-'}</td>
                      <td className="px-4 py-3 text-xs text-[#9C7D5A]">{row.uploaded_at ? formatDate(row.uploaded_at) : '-'}</td>
                      <td className="px-4 py-3">
                        {row.receipt_url ? (
                          <button
                            onClick={() => setReceiptModal(row.receipt_url!)}
                            className="flex h-9 w-11 items-center justify-center rounded-lg border-2 border-[#EEE2C8] bg-[#FAF3E0] transition-all duration-200 hover:border-[#C9943A] active:scale-95"
                            title="View receipt"
                          >
                            <Eye size={13} className="text-[#9C7D5A]" />
                          </button>
                        ) : <span className="text-xs text-[#9C7D5A]">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.receipt_status as ReceiptStatus} />
                      </td>
                      <td className="px-4 py-3">{qrBadge(row)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {row.receipt_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(row)}
                                disabled={loadingId === row.id}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60 ${flashApproveId === row.id ? 'festival-flash-success' : ''}`}
                                style={{ background: '#2D7A3A' }}
                              >
                                {loadingId === row.id ? <LoadingSpinner size={12} color="white" /> : <Check size={12} />}
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectModalId(row.id)}
                                disabled={loadingId === row.id}
                                className="flex items-center gap-1 rounded-lg bg-[#8B1A1A] px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60"
                              >
                                <X size={12} />
                                Reject
                              </button>
                            </>
                          )}
                          {row.receipt_status === 'approved' && !row.email_sent && (
                            <button
                              onClick={() => handleSendEmail(row)}
                              disabled={loadingId === row.id}
                              className="flex items-center gap-1 rounded-lg bg-[#2A5F99] px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60"
                            >
                              {loadingId === row.id ? <LoadingSpinner size={12} color="white" /> : <Send size={12} />}
                              Send Email
                            </button>
                          )}
                          {row.receipt_status === 'rejected' && (
                            <button
                              onClick={() => handleReReview(row)}
                              disabled={loadingId === row.id}
                              className="flex items-center gap-1 rounded-lg bg-[#8B6914] px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60"
                            >
                              {loadingId === row.id ? <LoadingSpinner size={12} color="white" /> : <RefreshCw size={12} />}
                              Re-review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeSection === 'profiles' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: <Users size={18} />, label: 'Total Profiles', value: profileStats.total, accent: '#C9943A' },
              { icon: <CheckCircle2 size={18} />, label: 'Profile Ready', value: profileStats.completed, accent: '#2A5F99' },
              { icon: <CheckCircle2 size={18} />, label: 'Approved Tickets', value: profileStats.approved, accent: '#2D7A3A' },
              { icon: <Users size={18} />, label: 'Admins', value: profileStats.admins, accent: '#7A1F28' },
            ].map(({ icon, label, value, accent }) => (
              <div key={label} className="festival-card-hover rounded-2xl border border-[rgba(201,148,58,0.1)] bg-white p-4 shadow-[0_4px_24px_rgba(122,31,40,0.08)]" style={{ borderTop: `3px solid ${accent}` }}>
                <div className="mb-1 flex items-center gap-2" style={{ color: accent }}>
                  {icon}
                  <span className="text-[0.72rem] uppercase tracking-wider text-[#9C7D5A]">{label}</span>
                </div>
                <div className="font-yatra text-3xl text-[#7A1F28]"><AnimatedCount value={value} /></div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(201,148,58,0.1)] bg-white px-4 py-3 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <div className="flex flex-wrap gap-1">
              {profileTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setProfileRoleFilter(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${profileRoleFilter === tab.key ? 'text-[#F5E4B8]' : 'text-[#5C3D2E] hover:bg-[#FAF3E0]'}`}
                  style={profileRoleFilter === tab.key ? { background: 'linear-gradient(135deg, #7A1F28, #4E1219)' } : {}}
                >
                  {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>
            <div className="relative min-w-[240px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
              <input
                id="admin-profiles-search"
                type="text"
                placeholder="Search all profiles by name, student no, or email..."
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                className="w-full rounded-lg border border-[#EEE2C8] bg-[#FAF3E0] py-1.5 pl-8 pr-3 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#C9943A]"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[rgba(201,148,58,0.1)] bg-white shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <div className="border-b border-[#EEE2C8] bg-[#FFF8EC] px-4 py-3">
              <p className="text-sm font-semibold text-[#7A1F28]">All User Profiles</p>
              <p className="text-xs text-[#9C7D5A]">Includes admin accounts, students, and each profile&apos;s current payment state.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}>
                  <tr>
                    {['User', 'Email', 'Role', 'Student No', 'Payment', 'QR', 'Uploaded'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-[0.7rem] font-bold uppercase tracking-wider text-[#F5E4B8]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-[#9C7D5A]">No user profiles matched this search.</td></tr>
                  ) : filteredProfiles.map((profile, index) => (
                    <tr
                      key={profile.id}
                      className="festival-entrance border-b border-[#EEE2C8] transition-colors hover:bg-[rgba(201,148,58,0.03)]"
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#E8BC6A] text-sm font-bold" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                            {profile.avatar_initial ?? profile.full_name?.charAt(0)?.toUpperCase() ?? profile.email?.charAt(0)?.toUpperCase() ?? 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#2B1A0E]">{profile.full_name || 'Unnamed user'}</p>
                            <p className="text-xs text-[#9C7D5A]">{profile.is_admin ? 'Administrator account' : 'Student account'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5C3D2E]">{profile.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${profile.is_admin ? 'border-[#7A1F28]/20 bg-[#7A1F28]/10 text-[#7A1F28]' : 'border-[#2A5F99]/20 bg-[#2A5F99]/10 text-[#2A5F99]'}`}>
                          {profile.is_admin ? 'Admin' : 'Student'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5C3D2E]">{profile.student_number || '-'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={profile.registrationStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {profile.qrState === 'used' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#2D7A3A]/25 bg-[#2D7A3A]/10 px-2 py-0.5 text-[0.68rem] font-semibold text-[#2D7A3A]">Used</span>
                        ) : profile.qrState === 'sent' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#3A7ABD]/25 bg-[#3A7ABD]/10 px-2 py-0.5 text-[0.68rem] font-semibold text-[#2A5F99]">Sent</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#9C7D5A]/20 bg-[#9C7D5A]/10 px-2 py-0.5 text-[0.68rem] font-semibold text-[#9C7D5A]">Not Sent</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#9C7D5A]">{profile.uploaded_at ? formatDate(profile.uploaded_at) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'games' && (
        <div className="space-y-6">
          <ErrorBanner message={gamesError} />

          <section className="rounded-2xl border border-[#EEE2C8] bg-white p-5 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-yatra text-2xl text-[#7A1F28]">Kumara / Kumariya</h2>
                <p className="text-sm text-[#9C7D5A]">Manage featured competition registrations</p>
              </div>
              <button
                onClick={() => exportToCSV(kumaraRows)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F28] px-4 py-2.5 text-sm font-semibold text-[#F5E4B8] transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
              >
                <Download size={15} />
                Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="border-b border-[#EEE2C8] text-left text-[0.72rem] uppercase tracking-[0.18em] text-[#9C7D5A]">
                    {['Name', 'Age', 'Gender', 'Batch', 'Photo', 'Skill', 'Registered', 'Actions'].map((heading) => (
                      <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kumaraRows.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-[#9C7D5A]">No Kumara/Kumariya registrations yet.</td></tr>
                  ) : kumaraRows.map((row, index) => (
                    <tr key={row.id} className="festival-entrance border-b border-[#F1E7D4]" style={{ animationDelay: `${index * 45}ms` }}>
                      <td className="px-3 py-3 text-sm font-semibold text-[#2B1A0E]">{row.full_name}</td>
                      <td className="px-3 py-3 text-sm text-[#5C3D2E]">{row.age}</td>
                      <td className="px-3 py-3 text-sm capitalize text-[#5C3D2E]">{row.gender}</td>
                      <td className="px-3 py-3 text-sm text-[#5C3D2E]">{row.batch}</td>
                      <td className="px-3 py-3">
                        {row.photo_preview_url ? (
                          <button
                            onClick={() => setGamePhotoModal({ url: row.photo_preview_url!, name: row.full_name })}
                            className="group relative overflow-hidden rounded-xl border border-[#EEE2C8] transition-all duration-200 hover:border-[#C9943A] active:scale-95"
                            title="View participant photo"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={row.photo_preview_url} alt={row.full_name} className="h-12 w-12 object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center bg-[#4E1219]/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <Eye size={14} className="text-white" />
                            </span>
                          </button>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[#EEE2C8] bg-[#FAF3E0] text-xs text-[#9C7D5A]">N/A</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-[#5C3D2E]">{row.skill || '-'}</td>
                      <td className="px-3 py-3 text-sm text-[#5C3D2E]">{formatDate(row.registered_at)}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDeleteKumara(row.id)}
                          disabled={gamesBusyId === row.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#8B1A1A] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                        >
                          {gamesBusyId === row.id ? <LoadingSpinner size={12} color="white" /> : <Trash2 size={13} />}
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-[#EEE2C8] bg-white p-5 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <div className="mb-4 flex items-center gap-3">
              <Trophy size={20} className="text-[#2D5A27]" />
              <div>
                <h2 className="font-yatra text-2xl text-[#2D5A27]">Tug of War</h2>
                <p className="text-sm text-[#9C7D5A]">Edit groups and manage team members</p>
              </div>
            </div>

            <div className="space-y-4">
              {tugGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#EEE2C8] bg-[#FAF3E0] p-5 text-sm text-[#9C7D5A]">
                  No Tug of War groups created yet.
                </div>
              ) : tugGroups.map((group) => (
                <div key={group.id} className="festival-card-hover rounded-2xl border border-[#E6EEDC] bg-[#FBFDF9] p-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      {editingGroupId === group.id ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            className="flex-1 rounded-xl border border-[#D9E8D3] bg-white px-4 py-2.5 text-sm text-[#2B1A0E] outline-none focus:border-[#4A7C41]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveGroupName(group.id)}
                              disabled={gamesBusyId === group.id}
                              className="rounded-xl bg-[#2D5A27] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingGroupId(null); setEditingGroupName('') }}
                              className="rounded-xl border border-[#D9E8D3] bg-white px-4 py-2 text-sm font-semibold text-[#5C3D2E] transition-all duration-200 active:scale-95"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-[#2D5A27]">{group.name}</h3>
                          <p className="mt-1 text-sm text-[#5C3D2E]">{group.members.length}/{group.max_members} members</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setEditingGroupId(group.id)
                          setEditingGroupName(group.name)
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#D9E8D3] bg-white px-3 py-2 text-sm font-semibold text-[#2D5A27] transition-all duration-200 hover:border-[#4A7C41] active:scale-95"
                      >
                        <Pencil size={14} />
                        Edit Name
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={gamesBusyId === group.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#8B1A1A] px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                      >
                        {gamesBusyId === group.id ? <LoadingSpinner size={12} color="white" /> : <Trash2 size={14} />}
                        Delete Group
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {group.members.map((member) => (
                      <div key={member.id} className="grid gap-3 rounded-2xl border border-[#E6EEDC] bg-white p-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8BC6A] text-sm font-bold" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                            {member.profiles?.avatar_initial ?? member.profiles?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#2B1A0E]">{member.profiles?.full_name || 'Unnamed member'}</p>
                            <p className="text-xs text-[#9C7D5A]">{member.user_id === group.created_by ? 'Group creator' : 'Member'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={moveTargets[member.id] ?? ''}
                            onChange={(e) => setMoveTargets((prev) => ({ ...prev, [member.id]: e.target.value }))}
                            className="rounded-xl border border-[#EEE2C8] bg-[#FAF3E0] px-3 py-2 text-sm text-[#2B1A0E] outline-none focus:border-[#C9943A]"
                          >
                            <option value="">Move to group...</option>
                            {tugGroups.filter((candidate) => candidate.id !== group.id).map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleMoveMember(member.id, moveTargets[member.id] ?? '')}
                            disabled={gamesBusyId === member.id}
                            className="rounded-xl bg-[#7A1F28] px-3 py-2 text-sm font-semibold text-[#F5E4B8] transition-all duration-200 active:scale-95 disabled:opacity-60"
                          >
                            Move
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={gamesBusyId === member.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1A1A] px-3 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60"
                        >
                          {gamesBusyId === member.id ? <LoadingSpinner size={12} color="white" /> : <X size={14} />}
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,10,5,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="relative w-full max-w-lg rounded-2xl border border-[#EEE2C8] bg-white p-5 shadow-2xl">
            <div className="absolute left-0 right-0 top-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-yatra text-xl text-[#7A1F28]">Payment Receipt</h2>
              <button onClick={() => setReceiptModal(null)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E0] transition-all duration-200 hover:bg-[#EEE2C8] active:scale-95"><X size={16} className="text-[#9C7D5A]" /></button>
            </div>
            {receiptModal.toLowerCase().endsWith('.pdf') ? (
              <div className="py-6 text-center">
                <p className="mb-3 text-sm text-[#5C3D2E]">PDF receipt - click to open in new tab.</p>
                <a href={receiptModal} target="_blank" rel="noopener noreferrer" className="rounded-xl px-4 py-2 text-sm font-semibold text-[#F5E4B8]" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)' }}>Open PDF</a>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receiptModal} alt="Payment receipt" className="max-h-[60vh] w-full rounded-xl border-2 border-[#EEE2C8] object-contain" />
            )}
          </div>
        </div>
      )}

      {gamePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,10,5,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="relative w-full max-w-xl rounded-2xl border border-[#EEE2C8] bg-white p-5 shadow-2xl">
            <div className="absolute left-0 right-0 top-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-yatra text-xl text-[#7A1F28]">Participant Photo</h2>
                <p className="text-sm text-[#9C7D5A]">{gamePhotoModal.name}</p>
              </div>
              <button onClick={() => setGamePhotoModal(null)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E0] transition-all duration-200 hover:bg-[#EEE2C8] active:scale-95"><X size={16} className="text-[#9C7D5A]" /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gamePhotoModal.url} alt={gamePhotoModal.name} className="max-h-[70vh] w-full rounded-xl border-2 border-[#EEE2C8] object-contain" />
          </div>
        </div>
      )}

      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,10,5,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="relative w-full max-w-md rounded-2xl border border-[#EEE2C8] bg-white p-6 shadow-2xl">
            <div className="absolute left-0 right-0 top-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <h2 className="mb-4 font-yatra text-xl text-[#7A1F28]">Reject Receipt</h2>
            <p className="mb-3 text-sm text-[#5C3D2E]">Provide an optional reason. The student will receive an email with this reason.</p>
            <textarea
              id="reject-reason-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt image is blurry or amount is unclear..."
              rows={4}
              className="w-full resize-none rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-3 py-2.5 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#C9943A]"
            />
            <div className="mt-4 flex gap-3">
              <button
                id="reject-confirm-btn"
                onClick={handleReject}
                disabled={!!loadingId}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60 ${rejectAnimating ? 'festival-shake' : ''}`}
                style={{ background: '#8B1A1A' }}
              >
                {loadingId && <LoadingSpinner size={14} color="white" />}
                Confirm Reject
              </button>
              <button onClick={() => { setRejectModalId(null); setRejectReason('') }} className="flex-1 rounded-xl border border-[#EEE2C8] bg-[#FAF3E0] py-2.5 text-sm font-semibold text-[#5C3D2E] transition-all duration-200 hover:bg-[#EEE2C8] active:scale-95">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
