'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import QRCode from 'react-qr-code'
import {
  Calendar, MapPin, Clock, Music2,
  CloudUpload, FileText, MessageCircle, AlertTriangle, X
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

    // No profile row at all
    if (!prof) {
      router.push('/profile-setup')
      return
    }

    // Profile exists but student_number not filled in yet
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

  // Real-time subscription
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
    return () => { supabase.removeChannel(channel) }
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
  // Row exists — update it
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
  // No row yet — insert it
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
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6">

      {/* ── EVENT HERO ── */}
      <div
        id="event-info"
        className="relative rounded-2xl p-6 md:p-8 mb-5 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4E1219 0%, #7A1F28 60%, #9B3A2A 100%)', boxShadow: '0 8px 48px rgba(122,31,40,0.18)' }}
      >
        {/* Star pattern overlay */}
        <div className="absolute inset-0 opacity-100" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='rgba(201,148,58,0.08)'%3E%3Cpolygon points='50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35'/%3E%3C/g%3E%3C/svg%3E\")", backgroundSize: '80px', backgroundRepeat: 'repeat' }} />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="relative w-20 h-20 flex-shrink-0 rounded-full overflow-hidden border-[3px] border-[#C9943A] shadow-xl">
              <Image src="/logo.png" alt="Awurudu 2026" fill className="object-cover" />
            </div>
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-widest mb-2" style={{ background: 'rgba(201,148,58,0.25)', border: '1px solid rgba(201,148,58,0.5)', color: '#E8BC6A' }}>
                Suurya Mangalya&apos;26
              </div>
              <h1 className="font-yatra text-2xl md:text-[2.2rem] leading-tight" style={{ color: '#E8BC6A' }}>
                Awurudu 2026
              </h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(245,228,184,0.8)' }}>
                SCU — Aluth Avurudu Celebration
              </p>
            </div>
          </div>

          {/* Event detail pills */}
          <div className="flex flex-wrap gap-4 mt-5">
            {[
              { icon: <Calendar size={14} />, label: 'Date', value: '8th May 2026' },
              { icon: <MapPin size={14} />, label: 'Venue', value: 'BMICH Kamatha, Colombo' },
              { icon: <Clock size={14} />, label: 'Time', value: '9:00 AM onwards' },
              { icon: <Music2 size={14} />, label: 'After Party', value: 'DJ After Party' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,148,58,0.2)', color: '#E8BC6A' }}>
                  {icon}
                </div>
                <div>
                  <div className="text-[0.65rem] uppercase tracking-wider" style={{ color: 'rgba(245,228,184,0.55)' }}>{label}</div>
                  <div className="text-sm font-medium" style={{ color: '#F5E4B8' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div className="mt-5">
            <CountdownTimer />
          </div>
        </div>
      </div>

      {/* ── 2-COL GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Registration Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-[rgba(201,148,58,0.12)] shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <h2 className="text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A] mb-3">Registration Status</h2>
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={status} />
              {registration?.uploaded_at && (
                <span className="text-xs text-[#9C7D5A]">Uploaded {formatDate(registration.uploaded_at)}</span>
              )}
            </div>
            {status === 'not_submitted' && (
              <p className="text-sm text-[#5C3D2E]">You haven&apos;t submitted your payment receipt yet. Upload it below to complete your registration.</p>
            )}
            {status === 'pending' && (
              <p className="text-sm text-[#5C3D2E]">Your payment receipt has been submitted and is awaiting admin approval. You&apos;ll receive an email with your QR code once approved.</p>
            )}
            {status === 'approved' && (
              <p className="text-sm text-[#2D7A3A] font-medium">Your registration is approved! Your entry QR code is ready below.</p>
            )}
            {status === 'rejected' && (
              <div>
                <p className="text-sm text-[#8B1A1A] mb-2">Your receipt could not be approved. Please re-upload a clear image.</p>
                {registration?.rejection_reason && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#8B1A1A]/8 border border-[#8B1A1A]/20">
                    <AlertTriangle size={14} className="text-[#8B1A1A] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#8B1A1A]"><strong>Reason:</strong> {registration.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Receipt Upload */}
          {showUpload && (
            <div className="bg-white rounded-2xl p-5 border border-[rgba(201,148,58,0.12)] shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
              <h2 className="text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A] mb-3">Payment Receipt</h2>

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
                className={`rounded-xl border-2 border-dashed p-7 text-center cursor-pointer transition-all ${dragOver ? 'border-[#C9943A] bg-[rgba(201,148,58,0.06)]' : 'border-[#EEE2C8] bg-[#FAF3E0] hover:border-[#C9943A] hover:bg-[rgba(201,148,58,0.04)]'}`}
              >
                <CloudUpload size={32} className="mx-auto mb-2 text-[#9C7D5A]" />
                <p className="text-sm text-[#5C3D2E] font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-[#9C7D5A] mt-1">JPEG, PNG or PDF — max 5MB</p>
              </div>

              {selectedFile && (
                <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FAF3E0] border border-[#EEE2C8]">
                  <FileText size={16} className="text-[#C9943A] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2B1A0E] truncate">{selectedFile.name}</p>
                    <p className="text-xs text-[#9C7D5A]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-[#9C7D5A] hover:text-[#8B1A1A] transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}

              {uploadError && <p className="mt-2 text-xs text-[#8B1A1A]">{uploadError}</p>}
              {uploadSuccess && <p className="mt-2 text-xs text-[#2D7A3A]">{uploadSuccess}</p>}

              {selectedFile && (
                <button
                  id="upload-receipt-btn"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#F5E4B8' }}
                >
                  {uploading && <LoadingSpinner size={16} color="#F5E4B8" />}
                  {uploading ? 'Uploading...' : 'Upload Receipt'}
                </button>
              )}
            </div>
          )}

          {/* QR Ticket */}
          {showQR && registration?.qr_token && (
            <div id="my-ticket" className="bg-white rounded-2xl p-5 border-2 border-[#C9943A] shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
              <h2 className="text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A] mb-4 text-center">Your Entry Pass</h2>
              <div className="flex flex-col items-center">
                <div className="p-3 rounded-2xl border-2 border-[#C9943A] shadow-lg mb-4" style={{ background: 'white' }}>
                  <QRCode
                    value={`${BASE_URL}/verify/${registration.qr_token}`}
                    size={200}
                    level="H"
                  />
                </div>
                <p className="font-semibold text-[#2B1A0E] text-base">{profile?.full_name}</p>
                <p className="text-sm text-[#9C7D5A]">{profile?.student_number}</p>
                <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(139,105,20,0.1)', border: '1px solid rgba(139,105,20,0.25)', color: '#8B6914' }}>
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  Single use only — do not share this QR code
                </div>
                <p className="mt-2 text-xs text-[#9C7D5A] text-center">Event: 8th May 2026 — BMICH Kamatha</p>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div className="space-y-5">
          {/* User card */}
          <div className="bg-white rounded-2xl p-5 border border-[rgba(201,148,58,0.12)] shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <div className="flex items-center gap-3">
              <AvatarCircle avatarUrl={profile?.avatar_url} initial={profile?.avatar_initial ?? profile?.full_name?.charAt(0) ?? 'U'} size={52} />
              <div>
                <p className="font-semibold text-[#2B1A0E]">{profile?.full_name}</p>
                <p className="text-xs text-[#9C7D5A]">{profile?.student_number}</p>
                <p className="text-xs text-[#9C7D5A]">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Contact Us */}
          <div className="bg-white rounded-2xl p-5 border border-[rgba(201,148,58,0.12)] shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
            <h2 className="text-[0.72rem] font-bold uppercase tracking-widest text-[#9C7D5A] mb-3">Contact Organisers</h2>
            <div className="space-y-3">
              {[
                { name: 'Harith', initial: 'H', phone: '+94768570754' },
                { name: 'Minol', initial: 'M', phone: '+94765373271' },
                { name: 'Alex', initial: 'A', phone: '+94706544700' },
              ].map(({ name, initial, phone }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-[#EEE2C8] last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 border-[#E8BC6A] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                      {initial}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#2B1A0E]">{name}</p>
                      <p className="text-[0.7rem] text-[#9C7D5A]">{phone}</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-85"
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
  )
}
