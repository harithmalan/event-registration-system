'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Hash, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { getInitial } from '@/lib/utils'
import AvatarCircle from '@/components/ui/AvatarCircle'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setAvatarUrl(session.user.user_metadata?.avatar_url ?? null)
      const { data: profile } = await supabase
        .from('profiles')
        .select('student_number, full_name')
        .eq('id', session.user.id)
        .single()
      if (profile?.student_number) { router.push('/dashboard'); return }
      if (profile?.full_name) setFullName(profile.full_name)
      setChecking(false)
    }
    checkProfile()
  }, [supabase, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName.trim() || !studentNumber.trim()) {
      setError('Both fields are required.')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: fullName.trim(),
        student_number: studentNumber.trim().toUpperCase(),
        email: session.user.email,
        avatar_initial: getInitial(fullName),
        avatar_url: avatarUrl,
      })
      if (upsertError) { setError(upsertError.message) }
      else { router.push('/dashboard') }
    } catch { setError('Failed to save profile. Please try again.') }
    finally { setLoading(false) }
  }

  const initial = fullName ? getInitial(fullName) : 'U'

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center">
        <LoadingSpinner size={32} color="#7A1F28" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[500px]">
        <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-[#EEE2C8] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />

          {/* Steps */}
          <div className="flex items-center justify-center gap-0 mb-7">
            {[{ num: '✓', label: 'Account', done: true }, { num: '2', label: 'Profile', active: true }, { num: '3', label: 'Payment', pending: true }].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.done ? 'bg-[#2D7A3A] text-white' : step.active ? 'bg-[#C9943A] text-white' : 'bg-[#EEE2C8] text-[#9C7D5A]'}`}>
                    {step.num}
                  </div>
                  <span className="text-[0.65rem] text-[#9C7D5A] mt-1">{step.label}</span>
                </div>
                {i < 2 && <div className={`w-12 h-0.5 mb-4 mx-1 ${step.done ? 'bg-[#2D7A3A]' : 'bg-[#EEE2C8]'}`} />}
              </div>
            ))}
          </div>

          {/* Avatar preview */}
          <div className="flex flex-col items-center mb-6">
            <AvatarCircle avatarUrl={avatarUrl} initial={initial} size={72} />
            <p className="text-xs text-[#9C7D5A] mt-2">
              {avatarUrl ? 'Your Google profile photo' : 'Avatar auto-generated from your name'}
            </p>
          </div>

          <h1 className="font-yatra text-xl text-[#7A1F28] text-center mb-1">Complete Your Profile</h1>
          <p className="text-sm text-[#9C7D5A] text-center mb-6">Required to access the registration portal</p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[0.75rem] font-semibold text-[#5C3D2E] mb-1.5 uppercase tracking-wider">
                Full Name — as per your student ID card
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
                <input
                  id="profile-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Harith Perera"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] text-sm text-[#2B1A0E] placeholder-[#9C7D5A] outline-none focus:border-[#C9943A] focus:shadow-[0_0_0_3px_rgba(201,148,58,0.12)] focus:bg-white transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-semibold text-[#5C3D2E] mb-1.5 uppercase tracking-wider">
                Student Number
              </label>
              <div className="relative">
                <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
                <input
                  id="profile-student-number"
                  type="text"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="e.g. IT21234567"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] text-sm text-[#2B1A0E] placeholder-[#9C7D5A] outline-none focus:border-[#C9943A] focus:shadow-[0_0_0_3px_rgba(201,148,58,0.12)] focus:bg-white transition-all"
                />
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#8B1A1A]/8 border border-[#8B1A1A]/20">
                <AlertCircle size={15} className="text-[#8B1A1A] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#8B1A1A]">{error}</p>
              </div>
            )}
            <button
              id="profile-save-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#F5E4B8', boxShadow: '0 2px 12px rgba(122,31,40,0.3)' }}
            >
              {loading && <LoadingSpinner size={16} color="#F5E4B8" />}
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
