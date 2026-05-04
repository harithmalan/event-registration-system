'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  Crown,
  ImagePlus,
  Mars,
  Music2,
  PartyPopper,
  Sparkles,
  Star,
  Trophy,
  Users,
  UtensilsCrossed,
  Venus
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type TabKey = 'featured' | 'common' | 'my'
type KumaraGender = 'kumara' | 'kumariya'

interface Profile {
  id: string
  full_name: string | null
  email: string
  avatar_initial: string | null
  avatar_url: string | null
  is_admin: boolean
}

interface KumaraRegistration {
  id: string
  user_id: string
  full_name: string
  age: number
  gender: KumaraGender
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

interface TugMember {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profiles: TugMemberProfile | null
}

interface RawTugMember {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profiles: TugMemberProfile | TugMemberProfile[] | null
}

interface TugGroup {
  id: string
  name: string
  created_by: string
  member_count: number
  max_members: number
  created_at: string
  members: TugMember[]
}

interface NoticeState {
  kind: 'success' | 'error'
  message: string
}

const commonGames = [
  { name: 'Dancing Chair', icon: Music2, bg: 'linear-gradient(135deg, #F7D488, #F5E4B8)' },
  { name: 'Goni Race', icon: Trophy, bg: 'linear-gradient(135deg, #F3C178, #F5E4B8)' },
  { name: 'Yogurt Eating Challenge', icon: UtensilsCrossed, bg: 'linear-gradient(135deg, #F9E8C3, #F6D9A1)' },
  { name: 'Flour Passing', icon: Sparkles, bg: 'linear-gradient(135deg, #FCE7BF, #F3C37B)' },
  { name: 'Balloon Dance', icon: PartyPopper, bg: 'linear-gradient(135deg, #F7CE8A, #F9EACD)' },
  { name: 'Pani Babare', icon: Star, bg: 'linear-gradient(135deg, #F7D999, #F7C46B)' },
  { name: 'Handa Matha Dehi Gediya', icon: Sparkles, bg: 'linear-gradient(135deg, #F5E0B2, #F7C97A)' },
  { name: 'Banis Kama', icon: UtensilsCrossed, bg: 'linear-gradient(135deg, #F7C985, #F8E6BE)' },
  { name: 'Kanna Mutti', icon: Trophy, bg: 'linear-gradient(135deg, #F8D8A4, #F4C171)' },
  { name: 'Aliyata Aha Thabima', icon: Users, bg: 'linear-gradient(135deg, #F8E1B8, #F3C27E)' },
]

function getInitial(name?: string | null, fallback = 'U') {
  return name?.trim()?.charAt(0)?.toUpperCase() || fallback
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#8B1A1A]/20 bg-[#8B1A1A]/8 px-3 py-2.5">
      <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-[#8B1A1A]" />
      <p className="text-xs text-[#8B1A1A]">{message}</p>
    </div>
  )
}

function SuccessBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#2D7A3A]/20 bg-[#2D7A3A]/8 px-3 py-2.5">
      <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[#2D7A3A]" />
      <p className="text-xs text-[#2D7A3A]">{message}</p>
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#EEE2C8]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#2D5A27] to-[#4A7C41] transition-all duration-700 ease-out"
        style={{ width: mounted ? `${percentage}%` : '0%' }}
      />
    </div>
  )
}

export default function GamesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('featured')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [kumaraRegistration, setKumaraRegistration] = useState<KumaraRegistration | null>(null)
  const [kumaraPhotoSignedUrl, setKumaraPhotoSignedUrl] = useState<string | null>(null)
  const [tugGroups, setTugGroups] = useState<TugGroup[]>([])
  const [userTugGroupId, setUserTugGroupId] = useState<string | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [editingKumara, setEditingKumara] = useState(false)

  const [kumaraForm, setKumaraForm] = useState({
    fullName: '',
    age: '',
    gender: 'kumara' as KumaraGender,
    batch: '',
    skill: '',
  })
  const [kumaraPhotoFile, setKumaraPhotoFile] = useState<File | null>(null)
  const [kumaraPhotoPreview, setKumaraPhotoPreview] = useState<string | null>(null)
  const [kumaraDragging, setKumaraDragging] = useState(false)
  const [kumaraLoading, setKumaraLoading] = useState(false)
  const [kumaraNotice, setKumaraNotice] = useState<NoticeState | null>(null)

  const [groupName, setGroupName] = useState('')
  const [tugLoading, setTugLoading] = useState(false)
  const [tugNotice, setTugNotice] = useState<NoticeState | null>(null)

  const userTugGroup = useMemo(
    () => tugGroups.find((group) => group.id === userTugGroupId) ?? null,
    [tugGroups, userTugGroupId]
  )

  const parseStoragePath = useCallback((value: string | null) => {
    if (!value) return null
    if (value.startsWith('http')) {
      const marker = '/game-photos/'
      const index = value.indexOf(marker)
      return index >= 0 ? value.slice(index + marker.length) : value
    }
    return value
  }, [])

  const createSignedPhotoUrl = useCallback(async (pathOrUrl: string | null) => {
    const parsedPath = parseStoragePath(pathOrUrl)
    if (!parsedPath) return null

    const { data, error } = await supabase.storage
      .from('game-photos')
      .createSignedUrl(parsedPath, 60 * 60)

    if (error) return null
    return data.signedUrl
  }, [parseStoragePath, supabase])

  const loadGamesData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_initial, avatar_url, is_admin')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!profileRow) {
      router.push('/profile-setup')
      return
    }

    setProfile(profileRow)

    const [{ data: kumaraRows }, { data: groupsData }, { data: membersData }] = await Promise.all([
      supabase
        .from('game_kumara_kumariya')
        .select('*')
        .eq('user_id', session.user.id)
        .order('registered_at', { ascending: false })
        .limit(1),
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

    const registration = (kumaraRows?.[0] as KumaraRegistration | undefined) ?? null
    setKumaraRegistration(registration)
    setEditingKumara(!registration)

    if (registration) {
      setKumaraForm({
        fullName: registration.full_name,
        age: String(registration.age),
        gender: registration.gender,
        batch: registration.batch,
        skill: registration.skill ?? '',
      })

      const signedUrl = await createSignedPhotoUrl(registration.photo_url)
      setKumaraPhotoSignedUrl(signedUrl)
      setKumaraPhotoPreview(signedUrl)
    } else {
      setKumaraForm({
        fullName: profileRow.full_name ?? '',
        age: '',
        gender: 'kumara',
        batch: '',
        skill: '',
      })
      setKumaraPhotoSignedUrl(null)
      setKumaraPhotoPreview(null)
    }

    const memberRows = ((membersData ?? []) as RawTugMember[]).map((member) => ({
      ...member,
      profiles: Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles ?? null,
    })) as TugMember[]
    const grouped = new Map<string, TugMember[]>()
    let myGroupId: string | null = null

    memberRows.forEach((member) => {
      if (!grouped.has(member.group_id)) grouped.set(member.group_id, [])
      grouped.get(member.group_id)?.push(member)
      if (member.user_id === session.user.id) myGroupId = member.group_id
    })

    const hydratedGroups: TugGroup[] = ((groupsData ?? []) as Omit<TugGroup, 'members'>[]).map((group) => ({
      ...group,
      members: (grouped.get(group.id) ?? []).sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
    }))

    setTugGroups(hydratedGroups)
    setUserTugGroupId(myGroupId)
    setLoading(false)
  }, [createSignedPhotoUrl, router, supabase])

  useEffect(() => {
    loadGamesData()
  }, [loadGamesData])

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .channel(`games-live-${profile.id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'tug_of_war_groups' }, () => {
        loadGamesData()
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'tug_of_war_members' }, () => {
        loadGamesData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadGamesData, profile, supabase])

  useEffect(() => {
    if (!kumaraNotice) return
    const timeout = setTimeout(() => setKumaraNotice(null), 4000)
    return () => clearTimeout(timeout)
  }, [kumaraNotice])

  useEffect(() => {
    if (!tugNotice) return
    const timeout = setTimeout(() => setTugNotice(null), 4000)
    return () => clearTimeout(timeout)
  }, [tugNotice])

  useEffect(() => {
    return () => {
      if (kumaraPhotoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(kumaraPhotoPreview)
      }
    }
  }, [kumaraPhotoPreview])

  function updateKumaraField<K extends keyof typeof kumaraForm>(field: K, value: (typeof kumaraForm)[K]) {
    setKumaraForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleKumaraPhotoSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      setKumaraNotice({ kind: 'error', message: 'Please select an image file only.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setKumaraNotice({ kind: 'error', message: 'Photo must be under 5MB.' })
      return
    }

    if (kumaraPhotoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(kumaraPhotoPreview)
    }

    const previewUrl = URL.createObjectURL(file)
    setKumaraPhotoFile(file)
    setKumaraPhotoPreview(previewUrl)
    setKumaraNotice(null)
  }

  async function handleKumaraSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    if (!kumaraForm.fullName.trim()) {
      setKumaraNotice({ kind: 'error', message: 'Full name is required.' })
      return
    }
    if (!kumaraForm.batch.trim()) {
      setKumaraNotice({ kind: 'error', message: 'Batch is required.' })
      return
    }

    const ageNumber = Number(kumaraForm.age)
    if (!Number.isFinite(ageNumber) || ageNumber < 18 || ageNumber > 35) {
      setKumaraNotice({ kind: 'error', message: 'Age must be between 18 and 35.' })
      return
    }

    if (!kumaraRegistration && !kumaraPhotoFile) {
      setKumaraNotice({ kind: 'error', message: 'Please upload a recent photo.' })
      return
    }

    setKumaraLoading(true)
    setKumaraNotice(null)

    try {
      let photoPath = kumaraRegistration?.photo_url ?? null

      if (kumaraPhotoFile) {
        const extension = kumaraPhotoFile.type === 'image/png' ? 'png' : 'jpg'
        photoPath = `${profile.id}/kumara.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('game-photos')
          .upload(photoPath, kumaraPhotoFile, { upsert: true })

        if (uploadError) throw new Error(uploadError.message)
      }

      const payload = {
        user_id: profile.id,
        full_name: kumaraForm.fullName.trim(),
        age: ageNumber,
        gender: kumaraForm.gender,
        batch: kumaraForm.batch.trim(),
        photo_url: photoPath,
        skill: kumaraForm.skill.trim() || null,
      }

      let savedRegistration: KumaraRegistration | null = null

      if (kumaraRegistration) {
        const { data, error } = await supabase
          .from('game_kumara_kumariya')
          .update(payload)
          .eq('id', kumaraRegistration.id)
          .select('*')
          .single()

        if (error) throw new Error(error.message)
        savedRegistration = data as KumaraRegistration
      } else {
        const { data, error } = await supabase
          .from('game_kumara_kumariya')
          .insert(payload)
          .select('*')
          .single()

        if (error) throw new Error(error.message)
        savedRegistration = data as KumaraRegistration
      }

      if (savedRegistration?.photo_url) {
        const signedUrl = await createSignedPhotoUrl(savedRegistration.photo_url)
        setKumaraPhotoSignedUrl(signedUrl)
        setKumaraPhotoPreview(signedUrl)
      }

      setKumaraRegistration(savedRegistration)
      setEditingKumara(false)
      setKumaraPhotoFile(null)

      const emailResponse = await fetch('/api/games/send-kumara-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: profile.email,
          studentName: payload.full_name,
          gender: payload.gender,
          batch: payload.batch,
        }),
      })

      if (emailResponse.ok && savedRegistration) {
        await supabase
          .from('game_kumara_kumariya')
          .update({ email_sent: true })
          .eq('id', savedRegistration.id)
        setKumaraRegistration({ ...savedRegistration, email_sent: true })
      }

      setKumaraNotice({
        kind: 'success',
        message: kumaraRegistration
          ? 'Your Kumara/Kumariya registration was updated successfully.'
          : 'Your Kumara/Kumariya registration is confirmed.'
      })
    } catch (error) {
      setKumaraNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not save your registration.'
      })
    } finally {
      setKumaraLoading(false)
    }
  }

  async function handleCreateGroup() {
    if (!profile) return
    if (!groupName.trim()) {
      setTugNotice({ kind: 'error', message: 'Please enter a group name.' })
      return
    }
    if (userTugGroupId) {
      setTugNotice({ kind: 'error', message: 'You are already in a Tug of War group.' })
      return
    }

    setTugLoading(true)
    setTugNotice(null)

    try {
      const { data: group, error: groupError } = await supabase
        .from('tug_of_war_groups')
        .insert({
          name: groupName.trim(),
          created_by: profile.id,
          max_members: 8,
          member_count: 0,
        })
        .select('*')
        .single()

      if (groupError) throw new Error(groupError.message)

      const { error: memberError } = await supabase
        .from('tug_of_war_members')
        .insert({
          group_id: group.id,
          user_id: profile.id,
        })

      if (memberError) throw new Error(memberError.message)

      await fetch('/api/games/send-tugofwar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: profile.email,
          studentName: profile.full_name,
          groupName: group.name,
          memberCount: 1,
          role: 'creator',
        }),
      })

      setGroupName('')
      setTugNotice({ kind: 'success', message: 'Your Tug of War group was created successfully.' })
      await loadGamesData()
    } catch (error) {
      setTugNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not create the group.'
      })
    } finally {
      setTugLoading(false)
    }
  }

  async function handleJoinGroup(group: TugGroup) {
    if (!profile) return
    if (userTugGroupId) {
      setTugNotice({ kind: 'error', message: 'You are already in a Tug of War group.' })
      return
    }
    if (group.member_count >= group.max_members) {
      setTugNotice({ kind: 'error', message: 'That group is already full.' })
      return
    }

    setTugLoading(true)
    setTugNotice(null)

    try {
      const { error } = await supabase
        .from('tug_of_war_members')
        .insert({
          group_id: group.id,
          user_id: profile.id,
        })

      if (error) throw new Error(error.message)

      await fetch('/api/games/send-tugofwar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: profile.email,
          studentName: profile.full_name,
          groupName: group.name,
          memberCount: Math.min(group.max_members, group.member_count + 1),
          role: 'member',
        }),
      })

      setTugNotice({ kind: 'success', message: `You joined ${group.name}.` })
      await loadGamesData()
    } catch (error) {
      setTugNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not join the group.'
      })
    } finally {
      setTugLoading(false)
    }
  }

  async function handleLeaveGroup() {
    if (!profile || !userTugGroupId) return

    setTugLoading(true)
    setTugNotice(null)

    try {
      const { error } = await supabase
        .from('tug_of_war_members')
        .delete()
        .eq('group_id', userTugGroupId)
        .eq('user_id', profile.id)

      if (error) throw new Error(error.message)

      setTugNotice({ kind: 'success', message: 'You left your Tug of War group.' })
      await loadGamesData()
    } catch (error) {
      setTugNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not leave the group.'
      })
    } finally {
      setTugLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center">
        <LoadingSpinner size={36} color="#7A1F28" />
      </div>
    )
  }

  return (
    <div className="festival-surface mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <div className="festival-entrance space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-[#7A1F28]/10 bg-gradient-to-br from-[#4E1219] via-[#7A1F28] to-[#8E332E] px-6 py-8 shadow-[0_12px_50px_rgba(122,31,40,0.22)] md:px-8">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='rgba(201,148,58,0.25)'%3E%3Cpolygon points='50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35'/%3E%3C/g%3E%3C/svg%3E\")", backgroundSize: '88px' }} />
          <div className="absolute inset-y-0 -left-1/4 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl animate-[shimmerSweep_12s_ease-in-out_infinite]" />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E8BC6A]/40 bg-[#C9943A]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#F5E4B8]">
                  <Star size={13} className="festival-float" />
                  Festival Arena
                </div>
                <h1 className="font-yatra text-3xl text-[#E8BC6A] md:text-[2.6rem]">Awurudu Games 2026</h1>
                <p className="mt-2 max-w-2xl text-sm text-[#F5E4B8]/85 md:text-base">
                  Join the celebration - compete, laugh, and win
                </p>
              </div>
              <div className="festival-float flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E8BC6A]/40 bg-[#C9943A]/18 text-[#E8BC6A] shadow-lg">
                <Trophy size={30} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { key: 'featured', label: 'Featured Games' },
                { key: 'common', label: 'Common Games' },
                { key: 'my', label: 'My Registrations' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    activeTab === tab.key
                      ? 'bg-[#E8BC6A] text-[#4E1219] shadow-lg'
                      : 'border border-[#E8BC6A]/35 bg-white/10 text-[#F5E4B8] hover:bg-white/15'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {activeTab === 'featured' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="festival-card-hover festival-entrance rounded-[28px] border border-[#C9943A]/35 bg-white p-5 shadow-[0_8px_32px_rgba(122,31,40,0.08)] md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9943A]/30 bg-[#FAF3E0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7A1F28]">
                    <Crown size={14} className="text-[#C9943A]" />
                    Featured Competition
                  </div>
                  <h2 className="font-yatra text-2xl text-[#7A1F28]">Awurudu Kumara & Kumariya</h2>
                  <p className="mt-2 text-sm text-[#5C3D2E]">Represent your batch and compete for the title</p>
                </div>
                <div className="rounded-2xl border border-[#E8BC6A]/50 bg-[#FAF3E0] p-3 text-[#C9943A]">
                  <Crown size={24} />
                </div>
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F5E4B8] px-3 py-1 text-xs font-semibold text-[#7A1F28]">
                  <Crown size={13} />
                  Kumara Crown
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF3E0] px-3 py-1 text-xs font-semibold text-[#7A1F28]">
                  <Venus size={13} />
                  Kumariya Crown
                </div>
              </div>

              {kumaraRegistration && !editingKumara ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#EEE2C8] bg-[#FFFCF6] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {kumaraPhotoSignedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={kumaraPhotoSignedUrl} alt={kumaraRegistration.full_name} className="h-28 w-28 rounded-2xl object-cover border border-[#EEE2C8]" />
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-[#EEE2C8] bg-[#FAF3E0] text-[#C9943A]">
                          <Camera size={24} />
                        </div>
                      )}
                      <div className="grid flex-1 grid-cols-1 gap-3 text-sm text-[#5C3D2E] sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9C7D5A]">Full Name</p>
                          <p className="mt-1 font-semibold text-[#2B1A0E]">{kumaraRegistration.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9C7D5A]">Age</p>
                          <p className="mt-1 font-semibold text-[#2B1A0E]">{kumaraRegistration.age}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9C7D5A]">Category</p>
                          <p className="mt-1 font-semibold capitalize text-[#2B1A0E]">{kumaraRegistration.gender}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9C7D5A]">Batch</p>
                          <p className="mt-1 font-semibold text-[#2B1A0E]">{kumaraRegistration.batch}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9C7D5A]">Special Skill</p>
                          <p className="mt-1 font-semibold text-[#2B1A0E]">{kumaraRegistration.skill || 'No special skill added yet'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-[#9C7D5A]">Registered On</p>
                          <p className="mt-1 font-semibold text-[#2B1A0E]">{formatDate(kumaraRegistration.registered_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {kumaraNotice?.kind === 'success' && <SuccessBanner message={kumaraNotice.message} />}
                  {kumaraNotice?.kind === 'error' && <ErrorBanner message={kumaraNotice.message} />}

                  <button
                    onClick={() => setEditingKumara(true)}
                    className="rounded-xl bg-[#7A1F28] px-4 py-2 text-sm font-semibold text-[#F5E4B8] transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                  >
                    Edit Registration
                  </button>
                </div>
              ) : (
                <form onSubmit={handleKumaraSubmit} className="space-y-4">
                  {kumaraNotice?.kind === 'success' && <SuccessBanner message={kumaraNotice.message} />}
                  {kumaraNotice?.kind === 'error' && <ErrorBanner message={kumaraNotice.message} />}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#5C3D2E]">Full Name</label>
                    <input
                      type="text"
                      value={kumaraForm.fullName}
                      onChange={(e) => updateKumaraField('fullName', e.target.value)}
                      className="w-full rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-4 py-3 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#C9943A] focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#5C3D2E]">Age</label>
                      <input
                        type="number"
                        min={18}
                        max={35}
                        value={kumaraForm.age}
                        onChange={(e) => updateKumaraField('age', e.target.value)}
                        className="w-full rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-4 py-3 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#C9943A] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#5C3D2E]">Batch</label>
                      <input
                        type="text"
                        value={kumaraForm.batch}
                        onChange={(e) => updateKumaraField('batch', e.target.value)}
                        placeholder="e.g. SE Batch 23"
                        className="w-full rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-4 py-3 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#C9943A] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#5C3D2E]">Category</label>
                    <div className="relative grid grid-cols-2 rounded-2xl border border-[#E8BC6A]/40 bg-[#FAF3E0] p-1">
                      <div
                        className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-[14px] bg-[#7A1F28] shadow-md transition-all duration-300 ${kumaraForm.gender === 'kumara' ? 'left-1' : 'left-[calc(50%+3px)]'}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateKumaraField('gender', 'kumara')}
                        className={`relative z-10 flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-95 ${kumaraForm.gender === 'kumara' ? 'text-[#E8BC6A]' : 'text-[#7A1F28]'}`}
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${kumaraForm.gender === 'kumara' ? 'bg-[#E8BC6A]/20' : 'bg-white'}`}>
                          <Mars size={14} />
                        </div>
                        Kumara
                      </button>
                      <button
                        type="button"
                        onClick={() => updateKumaraField('gender', 'kumariya')}
                        className={`relative z-10 flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-95 ${kumaraForm.gender === 'kumariya' ? 'text-[#E8BC6A]' : 'text-[#7A1F28]'}`}
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${kumaraForm.gender === 'kumariya' ? 'bg-[#E8BC6A]/20' : 'bg-white'}`}>
                          <Venus size={14} />
                        </div>
                        Kumariya
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#5C3D2E]">Recent Photo</label>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleKumaraPhotoSelect(e.target.files[0])}
                    />
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setKumaraDragging(true) }}
                      onDragLeave={() => setKumaraDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setKumaraDragging(false)
                        if (e.dataTransfer.files[0]) handleKumaraPhotoSelect(e.dataTransfer.files[0])
                      }}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 ${kumaraDragging ? 'border-[#C9943A] bg-[#FAF3E0]' : 'border-[#EEE2C8] bg-[#FFFCF6] hover:border-[#C9943A] hover:bg-[#FAF3E0]'}`}
                    >
                      <ImagePlus size={28} className={`mx-auto mb-2 text-[#C9943A] ${kumaraDragging ? 'festival-bounce' : ''}`} />
                      <p className="text-sm font-medium text-[#5C3D2E]">Upload a recent image</p>
                      <p className="mt-1 text-xs text-[#9C7D5A]">Image only - max 5MB</p>
                    </div>

                    {kumaraPhotoPreview && (
                      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#EEE2C8] bg-[#FFFCF6] p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={kumaraPhotoPreview} alt="Selected preview" className="h-16 w-16 rounded-xl object-cover border border-[#EEE2C8]" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#2B1A0E]">Photo preview ready</p>
                          <p className="text-xs text-[#9C7D5A]">This image will be attached to your registration.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#5C3D2E]">Special Skill</label>
                    <textarea
                      rows={4}
                      value={kumaraForm.skill}
                      onChange={(e) => updateKumaraField('skill', e.target.value)}
                      placeholder="Traditional dancing, singing"
                      className="w-full resize-none rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-4 py-3 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#C9943A] focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={kumaraLoading}
                      className="flex items-center gap-2 rounded-xl bg-[#7A1F28] px-5 py-3 text-sm font-semibold text-[#F5E4B8] transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                    >
                      {kumaraLoading && <LoadingSpinner size={16} color="#F5E4B8" />}
                      {kumaraRegistration ? 'Update Registration' : 'Confirm Registration'}
                    </button>
                    {kumaraRegistration && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKumara(false)
                          setKumaraPhotoPreview(kumaraPhotoSignedUrl)
                          setKumaraPhotoFile(null)
                          setKumaraNotice(null)
                        }}
                        className="rounded-xl border border-[#EEE2C8] bg-[#FAF3E0] px-5 py-3 text-sm font-semibold text-[#5C3D2E] transition-all duration-200 hover:border-[#C9943A] active:scale-95"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>

            <section className="festival-card-hover festival-entrance rounded-[28px] border border-[#2D5A27]/30 bg-white p-5 shadow-[0_8px_32px_rgba(45,90,39,0.08)] md:p-6" style={{ animationDelay: '120ms' }}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#4A7C41]/25 bg-[#F3F8F1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2D5A27]">
                    <Users size={14} />
                    Featured Team Game
                  </div>
                  <h2 className="font-yatra text-2xl text-[#2D5A27]">Tug of War</h2>
                  <p className="mt-2 text-sm text-[#5C3D2E]">Form a team of 8 and battle it out</p>
                </div>
                <div className="rounded-2xl border border-[#4A7C41]/30 bg-[#F3F8F1] p-3 text-[#2D5A27]">
                  <Users size={24} />
                </div>
              </div>

              <div className="space-y-4">
                {tugNotice?.kind === 'success' && <SuccessBanner message={tugNotice.message} />}
                {tugNotice?.kind === 'error' && <ErrorBanner message={tugNotice.message} />}

                {userTugGroup && (
                  <div className="rounded-2xl border border-[#4A7C41]/25 bg-[#F3F8F1] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4A7C41]">Your Group</p>
                        <h3 className="mt-1 text-lg font-semibold text-[#2D5A27]">{userTugGroup.name}</h3>
                        <p className="mt-1 text-sm text-[#5C3D2E]">{userTugGroup.members.length}/{userTugGroup.max_members} members joined</p>
                      </div>
                      <button
                        onClick={handleLeaveGroup}
                        disabled={tugLoading}
                        className="rounded-xl bg-[#2D5A27] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                      >
                        {tugLoading ? 'Leaving...' : 'Leave Group'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[#EEE2C8] bg-[#FFFCF6] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9C7D5A]">Create a Group</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Your group name"
                      className="flex-1 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-4 py-3 text-sm text-[#2B1A0E] outline-none transition-all duration-200 focus:border-[#4A7C41] focus:bg-white"
                    />
                    <button
                      onClick={handleCreateGroup}
                      disabled={tugLoading || !!userTugGroupId}
                      className="rounded-xl bg-[#2D5A27] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                    >
                      {tugLoading ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9C7D5A]">Browse and Join Groups</p>
                    <p className="text-xs text-[#9C7D5A]">{tugGroups.length} groups live</p>
                  </div>

                  {tugGroups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#EEE2C8] bg-[#FAF3E0] p-5 text-sm text-[#9C7D5A]">
                      No groups yet. Create the first Tug of War team.
                    </div>
                  ) : (
                    tugGroups.map((group, index) => {
                      const full = group.members.length >= group.max_members
                      const alreadyMine = group.id === userTugGroupId
                      return (
                        <div
                          key={group.id}
                          className="festival-card-hover festival-entrance rounded-2xl border border-[#EEE2C8] bg-[#FFFCF6] p-4 shadow-sm"
                          style={{ animationDelay: `${index * 90}ms` }}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-lg font-semibold text-[#2B1A0E]">{group.name}</h3>
                                  {alreadyMine && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#2D5A27]/10 px-2 py-1 text-[11px] font-semibold text-[#2D5A27]">
                                      <BadgeCheck size={12} />
                                      Your team
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm text-[#5C3D2E]">{group.members.length}/{group.max_members} members</p>
                              </div>
                              <button
                                onClick={() => handleJoinGroup(group)}
                                disabled={tugLoading || full || !!userTugGroupId}
                                className="rounded-xl bg-[#2D5A27] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {full ? 'Full' : 'Join'}
                              </button>
                            </div>

                            <ProgressBar value={group.members.length} max={group.max_members} />

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex -space-x-2">
                                {group.members.slice(0, 8).map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-sm"
                                    style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}
                                  >
                                    {member.profiles?.avatar_initial || getInitial(member.profiles?.full_name)}
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => setExpandedGroupId((prev) => (prev === group.id ? null : group.id))}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-[#7A1F28] transition-all duration-200 hover:text-[#4E1219] active:scale-95"
                              >
                                {expandedGroupId === group.id ? 'Hide members' : 'Show members'}
                                <ChevronDown size={15} className={`transition-transform duration-200 ${expandedGroupId === group.id ? 'rotate-180' : ''}`} />
                              </button>
                            </div>

                            {expandedGroupId === group.id && (
                              <div className="rounded-2xl border border-[#EEE2C8] bg-white p-3">
                                <div className="space-y-2">
                                  {group.members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF3E0] px-3 py-2">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8BC6A] text-xs font-bold" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                                          {member.profiles?.avatar_initial || getInitial(member.profiles?.full_name)}
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-[#2B1A0E]">{member.profiles?.full_name || 'Unnamed member'}</p>
                                          <p className="text-xs text-[#9C7D5A]">Joined {formatDate(member.joined_at)}</p>
                                        </div>
                                      </div>
                                      {member.user_id === group.created_by && (
                                        <span className="rounded-full bg-[#C9943A]/15 px-2 py-1 text-[11px] font-semibold text-[#7A1F28]">Creator</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'common' && (
          <section className="festival-entrance rounded-[28px] border border-[#EEE2C8] bg-white p-5 shadow-[0_8px_32px_rgba(122,31,40,0.08)] md:p-6">
            <div className="mb-5 rounded-2xl border border-[#C9943A]/20 bg-[#FAF3E0] px-4 py-3 text-sm text-[#5C3D2E]">
              These games are open to all attendees on the day. No pre-registration required.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {commonGames.map((game, index) => {
                const Icon = game.icon
                return (
                  <div
                    key={game.name}
                    className="festival-card-hover festival-entrance rounded-[24px] p-5 shadow-[0_6px_24px_rgba(122,31,40,0.08)] transition-all duration-300 hover:scale-[1.02]"
                    style={{ background: game.bg, animationDelay: `${index * 80}ms` }}
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-white/65 p-3 text-[#7A1F28]">
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full bg-[#C9943A]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A1F28]">
                        Play on the day
                      </span>
                    </div>
                    <h3 className="font-yatra text-2xl leading-tight text-[#7A1F28]">{game.name}</h3>
                    <p className="mt-2 text-sm text-[#5C3D2E]">Join in with friends and enjoy the Awurudu spirit.</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {activeTab === 'my' && (
          <section className="festival-entrance rounded-[28px] border border-[#EEE2C8] bg-white p-5 shadow-[0_8px_32px_rgba(122,31,40,0.08)] md:p-6">
            <div className="space-y-5">
              {kumaraRegistration && (
                <div className="festival-card-hover rounded-[24px] border border-[#C9943A]/30 bg-[#FFFCF6] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {kumaraPhotoSignedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={kumaraPhotoSignedUrl} alt={kumaraRegistration.full_name} className="h-24 w-24 rounded-2xl border border-[#EEE2C8] object-cover" />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-[#EEE2C8] bg-[#FAF3E0] text-[#C9943A]">
                        <Camera size={24} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#F5E4B8] px-3 py-1 text-xs font-semibold text-[#7A1F28]">
                        <Crown size={13} />
                        Kumara / Kumariya
                      </div>
                      <h3 className="text-lg font-semibold text-[#2B1A0E]">{kumaraRegistration.full_name}</h3>
                      <p className="mt-1 text-sm text-[#5C3D2E]">
                        {kumaraRegistration.gender} | {kumaraRegistration.batch} | Registered on {formatDate(kumaraRegistration.registered_at)}
                      </p>
                      <p className="mt-2 text-sm text-[#5C3D2E]">{kumaraRegistration.skill || 'No special skill added'}</p>
                    </div>
                  </div>
                </div>
              )}

              {userTugGroup && (
                <div className="festival-card-hover rounded-[24px] border border-[#2D5A27]/25 bg-[#F3F8F1] p-4">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2D5A27]">
                    <Users size={13} />
                    Tug of War
                  </div>
                  <h3 className="text-lg font-semibold text-[#2D5A27]">{userTugGroup.name}</h3>
                  <p className="mt-1 text-sm text-[#5C3D2E]">{userTugGroup.members.length}/{userTugGroup.max_members} members in your team</p>
                  <div className="mt-4 space-y-2">
                    {userTugGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8BC6A] text-xs font-bold" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                          {member.profiles?.avatar_initial || getInitial(member.profiles?.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2B1A0E]">{member.profiles?.full_name || 'Unnamed member'}</p>
                          <p className="text-xs text-[#9C7D5A]">{member.user_id === userTugGroup.created_by ? 'Creator' : 'Member'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!kumaraRegistration && !userTugGroup && (
                <div className="rounded-[24px] border border-dashed border-[#EEE2C8] bg-[#FAF3E0] p-6 text-center">
                  <p className="text-lg font-semibold text-[#7A1F28]">Not registered for any featured games yet</p>
                  <p className="mt-2 text-sm text-[#9C7D5A]">Switch to Featured Games and join the competitions.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
