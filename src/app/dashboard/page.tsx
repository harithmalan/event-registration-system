'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import QRCode from 'react-qr-code'
import {
  Calendar, MapPin, Clock, Music2,
  CloudUpload, FileText, MessageCircle, AlertTriangle, X,
  ClipboardList, ScanLine, ChevronRight, Trophy, Ticket
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import AvatarCircle from '@/components/ui/AvatarCircle'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CountdownTimer from '@/components/CountdownTimer'

type ReceiptStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

interface Profile {
  id: string
  full_name: string
  student_number: string
  email: string
  avatar_url: string | null
  avatar_initial: string | null
  is_admin: boolean
}

interface Registration {
  id: string
  receipt_status: ReceiptStatus
  rejection_reason: string | null
  qr_token: string | null
  qr_used: boolean
  uploaded_at: string | null
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!prof) {
      router.push('/profile-setup')
      return
    }

    if (!prof.student_number || prof.student_number.trim() === '') {
      router.push('/profile-setup')
      return
    }

    setProfile(prof)

    const { data: reg } = await supabase
      .from('registrations')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    setRegistration(reg)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .channel('registration-changes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'registrations',
        filter: `user_id=eq.${profile.id}`,
      }, (payload: { new: Registration }) => {
        setRegistration(payload.new as Registration)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, supabase])

  function handleFileSelect(file: File) {
    setUploadError('')
    setUploadSuccess('')
    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setUploadError('Only JPEG, PNG, or PDF files are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5MB.')
      return
    }
    setSelectedFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0])
  }

  async function handleUpload() {
    if (!selectedFile || !profile) return
    setUploading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      const ext = selectedFile.name.split('.').pop()
      const path = `${profile.id}/receipt.${ext}`
      const { error: storageError } = await supabase.storage
        .from('receipts')
        .upload(path, selectedFile, { upsert: true })

      if (storageError) throw new Error(storageError.message)

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      const receiptUrl = urlData.publicUrl

      let dbError = null

      if (registration) {
        const { error } = await supabase
          .from('registrations')
          .update({
            receipt_url: receiptUrl,
            receipt_status: 'pending',
            uploaded_at: new Date().toISOString(),
          })
          .eq('user_id', profile.id)
        dbError = error
      } else {
        const { error } = await supabase
          .from('registrations')
          .insert({
            user_id: profile.id,
            receipt_url: receiptUrl,
            receipt_status: 'pending',
            uploaded_at: new Date().toISOString(),
          })
        dbError = error
      }

      if (dbError) throw new Error(dbError.message)

      setUploadSuccess('Receipt uploaded successfully! Awaiting admin review.')
      setSelectedFile(null)
      await loadData()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!uploadSuccess) return
    const timeout = setTimeout(() => setUploadSuccess(''), 4000)
    return () => clearTimeout(timeout)
  }, [uploadSuccess])

  const status = registration?.receipt_status ?? 'not_submitted'
  const showUpload = status === 'not_submitted' || status === 'rejected'
  const showQR = status === 'approved'

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center">
        <LoadingSpinner size={36} color="#7A1F28" />
      </div>
    )
  }

  return (
    <div className="festival-surface mx-auto max-w-[1100px] px-4 py-6 md:px-6">
      <div className="festival-entrance space-y-5">
        <div
          id="event-info"
          className="festival-card-hover relative overflow-hidden rounded-2xl p-6 md:p-8"
          style={{ background: 'linear-gradient(135deg, #4E1219 0%, #7A1F28 60%, #9B3A2A 100%)', boxShadow: '0 8px 48px rgba(122,31,40,0.18)' }}
        >
          <div className="absolute inset-0 opacity-100" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='rgba(201,148,58,0.08)'%3E%3Cpolygon points='50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35'/%3E%3C/g%3E%3C/svg%3E\")", backgroundSize: '80px', backgroundRepeat: 'repeat' }} />
          <div className="absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl animate-[shimmerSweep_10s_ease-in-out_infinite]" />

          <div className="relative z-10">
            <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-[3px] border-[#C9943A] shadow-xl">
                <Image src="/logo.png" alt="Awurudu 2026" fill className="object-cover festival-float" />
              </div>
              <div>
                <div className="mb-2 inline-block rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-widest" style={{ background: 'rgba(201,148,58,0.25)', border: '1px solid rgba(201,148,58,0.5)', color: '#E8BC6A' }}>
                  Suurya Mangalya&apos;26
                </div>
                <h1 className="font-yatra text-2xl leading-tight md:text-[2.2rem]" style={{ color: '#E8BC6A' }}>
                  Awurudu 2026
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'rgba(245,228,184,0.8)' }}>
                  SCU - Aluth Avurudu Celebration
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-4">
              {[
                { icon: <Calendar size={14} />, label: 'Date', value: '8th May 2026' },
                { icon: <MapPin size={14} />, label: 'Venue', value: 'BMICH Hidden Escape, Colombo' },
                { icon: <Clock size={14} />, label: 'Time', value: '9:00 AM onwards' },
                { icon: <Ticket size={14} />, label: 'Ticket Price', value: 'LKR 850' },
                { icon: <Music2 size={14} />, label: 'After Party', value: 'DJ After Party' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(201,148,58,0.2)', color: '#E8BC6A' }}>
                    {icon}
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider" style={{ color: 'rgba(245,228,184,0.55)' }}>{label}</div>
                    <div className="text-sm font-medium" style={{ color: '#F5E4B8' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <CountdownTimer />
            </div>
          </div>
        </div>

        {profile?.is_admin && (
          <div className="festival-entrance-delayed">
            <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A]">
              Admin Quick Access
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href="/admin"
                className="festival-card-hover group festival-shimmer relative flex items-center gap-4 overflow-hidden rounded-2xl border-2 border-[#C9943A] p-5 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}
              >
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='rgba(201,148,58,0.3)'%3E%3Cpolygon points='30,3 37,21 57,21 41,34 47,55 30,42 13,55 19,34 3,21 23,21'/%3E%3C/g%3E%3C/svg%3E\")",
                    backgroundSize: '50px'
                  }}
                />
                <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(201,148,58,0.2)', border: '1px solid rgba(201,148,58,0.4)' }}>
                  <ClipboardList size={22} style={{ color: '#E8BC6A' }} />
                </div>
                <div className="relative z-10">
                  <p className="font-yatra text-lg leading-tight" style={{ color: '#E8BC6A' }}>
                    Admin Panel
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'rgba(245,228,184,0.7)' }}>
                    Review and approve registrations
                  </p>
                </div>
                <ChevronRight size={18} className="relative z-10 ml-auto flex-shrink-0 opacity-60 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100" style={{ color: '#E8BC6A' }} />
              </a>

              <a
                href="/gate"
                className="festival-card-hover group festival-shimmer relative flex items-center gap-4 overflow-hidden rounded-2xl border-2 p-5 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #1A3A1A, #2D5A2D)', borderColor: '#4A9B4A' }}
              >
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='rgba(74,155,74,0.3)'%3E%3Cpolygon points='30,3 37,21 57,21 41,34 47,55 30,42 13,55 19,34 3,21 23,21'/%3E%3C/g%3E%3C/svg%3E\")",
                    backgroundSize: '50px'
                  }}
                />
                <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(74,155,74,0.2)', border: '1px solid rgba(74,155,74,0.4)' }}>
                  <ScanLine size={22} style={{ color: '#86EFAC' }} />
                </div>
                <div className="relative z-10">
                  <p className="font-yatra text-lg leading-tight" style={{ color: '#86EFAC' }}>
                    Gate Scan
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'rgba(134,239,172,0.7)' }}>
                    Scan QR codes at the entrance
                  </p>
                </div>
                <ChevronRight size={18} className="relative z-10 ml-auto flex-shrink-0 opacity-60 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100" style={{ color: '#86EFAC' }} />
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="festival-card-hover rounded-2xl border border-[rgba(201,148,58,0.12)] bg-white p-5 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
              <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A]">Registration Status</h2>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#FAF3E0] px-3 py-1 text-xs font-semibold text-[#7A1F28]">
                <Ticket size={13} className="text-[#C9943A]" />
                Ticket Price: LKR 850
              </div>
              <div className={`mb-3 flex items-center gap-3 ${status === 'approved' ? 'festival-confetti' : ''}`}>
                <StatusBadge status={status} />
                {registration?.uploaded_at && (
                  <span className="text-xs text-[#9C7D5A]">Uploaded {formatDate(registration.uploaded_at)}</span>
                )}
              </div>
              {status === 'not_submitted' && (
                <p className="text-sm text-[#5C3D2E]">You have not submitted your payment receipt yet. Upload it below to complete your registration.</p>
              )}
              {status === 'pending' && (
                <p className="text-sm text-[#5C3D2E]">Your payment receipt has been submitted and is awaiting admin approval. You will receive an email with your QR code once approved.</p>
              )}
              {status === 'approved' && (
                <p className="text-sm font-medium text-[#2D7A3A]">Your registration is approved. Your entry QR code is ready below.</p>
              )}
              {status === 'rejected' && (
                <div>
                  <p className="mb-2 text-sm text-[#8B1A1A]">Your receipt could not be approved. Please re-upload a clear image.</p>
                  {registration?.rejection_reason && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#8B1A1A]/20 bg-[#8B1A1A]/8 px-3 py-2.5">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[#8B1A1A]" />
                      <p className="text-xs text-[#8B1A1A]"><strong>Reason:</strong> {registration.rejection_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <a
              href="/games"
              className="festival-card-hover group flex items-center gap-4 rounded-2xl border-2 border-[#C9943A]/40 bg-gradient-to-r from-[#FAF3E0] to-[#FFF8EC] p-4 transition-all duration-300 hover:border-[#C9943A] hover:shadow-lg"
            >
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg, #C9943A, #E8BC6A)' }}
              >
                <Trophy size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#2B1A0E]">Awurudu Games</p>
                <p className="mt-0.5 text-xs text-[#9C7D5A]">Register for Kumara/Kumariya and Tug of War</p>
              </div>
              <ChevronRight size={18} className="text-[#C9943A] transition-transform duration-200 group-hover:translate-x-1" />
            </a>

            {showUpload && (
              <div className="festival-card-hover rounded-2xl border border-[rgba(201,148,58,0.12)] bg-white p-5 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
                <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A]">Payment Receipt</h2>
                <p className="mb-3 text-sm text-[#7A1F28]">Ticket Price: <span className="font-semibold">LKR 850</span></p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-7 text-center transition-all duration-200 ${dragOver ? 'border-[#C9943A] bg-[rgba(201,148,58,0.06)]' : 'border-[#EEE2C8] bg-[#FAF3E0] hover:border-[#C9943A] hover:bg-[rgba(201,148,58,0.04)]'}`}
                >
                  <CloudUpload size={32} className={`mx-auto mb-2 text-[#9C7D5A] ${dragOver ? 'festival-bounce' : ''}`} />
                  <p className="text-sm font-medium text-[#5C3D2E]">Click to upload or drag and drop</p>
                  <p className="mt-1 text-xs text-[#9C7D5A]">JPEG, PNG or PDF - max 5MB</p>
                </div>

                {selectedFile && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#EEE2C8] bg-[#FAF3E0] px-3 py-2.5">
                    <FileText size={16} className="flex-shrink-0 text-[#C9943A]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#2B1A0E]">{selectedFile.name}</p>
                      <p className="text-xs text-[#9C7D5A]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="text-[#9C7D5A] transition-colors duration-200 hover:text-[#8B1A1A] active:scale-95">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#8B1A1A]/20 bg-[#8B1A1A]/8 px-3 py-2.5">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[#8B1A1A]" />
                    <p className="text-xs text-[#8B1A1A]">{uploadError}</p>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#2D7A3A]/20 bg-[#2D7A3A]/8 px-3 py-2.5 text-xs text-[#2D7A3A]">
                    <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2D7A3A] text-white">✓</div>
                    <p>{uploadSuccess}</p>
                  </div>
                )}

                {selectedFile && (
                  <button
                    id="upload-receipt-btn"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#F5E4B8' }}
                  >
                    {uploading && <LoadingSpinner size={16} color="#F5E4B8" />}
                    {uploading ? 'Uploading...' : 'Upload Receipt'}
                  </button>
                )}
              </div>
            )}

            {showQR && registration?.qr_token && (
              <div id="my-ticket" className="festival-card-hover rounded-2xl border-2 border-[#C9943A] bg-white p-5 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
                <h2 className="mb-4 text-center text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A]">Your Entry Pass</h2>
                <div className="flex flex-col items-center">
                  <div className="mb-4 rounded-2xl border-2 border-[#C9943A] bg-white p-3 shadow-lg">
                    <QRCode
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'https://scu-awurudu-2026.vercel.app'}/verify/${registration.qr_token}`}
                      size={200}
                      level="H"
                    />
                  </div>
                  <p className="text-base font-semibold text-[#2B1A0E]">{profile?.full_name}</p>
                  <p className="text-sm text-[#9C7D5A]">{profile?.student_number}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7A1F28]">Ticket Price: LKR 850</p>
                  <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(139,105,20,0.1)', border: '1px solid rgba(139,105,20,0.25)', color: '#8B6914' }}>
                    <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                    Single use only - do not share this QR code
                  </div>
                  <p className="mt-2 text-center text-xs text-[#9C7D5A]">Event: 8th May 2026 - BMICH Hidden Escape</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="festival-card-hover rounded-2xl border border-[rgba(201,148,58,0.12)] bg-white p-5 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
              <div className="flex items-center gap-3">
                <AvatarCircle avatarUrl={profile?.avatar_url} initial={profile?.avatar_initial ?? profile?.full_name?.charAt(0) ?? 'U'} size={52} />
                <div>
                  <p className="font-semibold text-[#2B1A0E]">{profile?.full_name}</p>
                  <p className="text-xs text-[#9C7D5A]">{profile?.student_number}</p>
                  <p className="text-xs text-[#9C7D5A]">{profile?.email}</p>
                </div>
              </div>
            </div>

            <div className="festival-card-hover rounded-2xl border border-[rgba(201,148,58,0.12)] bg-white p-5 shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
              <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A]">Contact Organisers</h2>
              <div className="space-y-3">
                {[
                  { name: 'Harith', initial: 'H', phone: '+94768570754' },
                  { name: 'Minol', initial: 'M', phone: '+94765373271' },
                  { name: 'Alex', initial: 'A', phone: '+94706544700' },
                ].map(({ name, initial, phone }, index) => (
                  <div
                    key={name}
                    className="festival-entrance flex items-center justify-between border-b border-[#EEE2C8] py-2 last:border-b-0"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#E8BC6A] text-sm font-bold" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                        {initial}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#2B1A0E]">{name}</p>
                        <p className="text-[0.7rem] text-[#9C7D5A]">{phone}</p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:opacity-85 active:scale-95"
                      style={{ background: '#25D366' }}
                    >
                      <MessageCircle size={12} />
                      WhatsApp
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
