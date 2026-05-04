'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isGoogleUser, setIsGoogleUser] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserId(user.id)
      setUserEmail(user.email ?? '')

      // Check if this is a Google user
      const googleAvatar = user.user_metadata?.avatar_url ??
                           user.user_metadata?.picture ?? null
      const googleName = user.user_metadata?.full_name ??
                         user.user_metadata?.name ?? ''
      const isGoogle = !!googleAvatar

      setIsGoogleUser(isGoogle)

      // Google users: pre-fill avatar and name
      if (isGoogle) {
        setAvatarUrl(googleAvatar)
        setFullName(googleName)
      }
      // Email users: no avatar, empty name (they must type it)

      // Check if profile already fully complete — redirect if so
      const { data: profile } = await supabase
        .from('profiles')
        .select('student_number, full_name')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.student_number?.trim()) {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }
    loadUser()
  }, [supabase, router])

  async function handleSave() {
    setError('')
    if (!fullName.trim()) { setError('Please enter your full name as per your Student ID card.'); return }
    if (!studentNumber.trim()) { setError('Please enter your student number.'); return }
    if (!userId) return

    setSaving(true)

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: userEmail,
        full_name: fullName.trim(),
        student_number: studentNumber.trim().toUpperCase(),
        avatar_initial: fullName.trim().charAt(0).toUpperCase(),
        // Google users: save their Google photo URL
        // Email users: null — they get the initial circle everywhere
        avatar_url: isGoogleUser ? avatarUrl : null,
      }, { onConflict: 'id' })

    if (upsertError) {
      setError(upsertError.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  // For initial circle — use first letter of name they've typed, or email
  const initial = fullName.trim().charAt(0).toUpperCase() ||
                  userEmail.charAt(0).toUpperCase() || 'U'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF3E0]">
        <LoadingSpinner size={36} color="#7A1F28" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF3E0] px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#EEE2C8] p-8 w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { n: 1, label: 'Account', done: true },
            { n: 2, label: 'Profile', active: true },
            { n: 3, label: 'Payment' },
          ].map(({ n, label, done, active }, i) => (
            <div key={n} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-[#EEE2C8]" />}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                done ? 'bg-[#2D7A3A] border-[#2D7A3A] text-white' :
                active ? 'bg-white border-[#C9943A] text-[#C9943A]' :
                'bg-white border-[#EEE2C8] text-[#9C7D5A]'
              }`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-xs ${active ? 'text-[#7A1F28] font-semibold' : 'text-[#9C7D5A]'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Avatar — Google photo OR initial circle */}
        <div className="flex flex-col items-center mb-6">
          {isGoogleUser && avatarUrl ? (
            <>
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-[#C9943A] shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt="Google profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-xs text-[#9C7D5A] mt-2">Profile picture from Google</p>
            </>
          ) : (
            <>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-[#E8BC6A] shadow-lg font-bold text-2xl"
                style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}
              >
                {initial}
              </div>
              <p className="text-xs text-[#9C7D5A] mt-2">Avatar auto-generated from your name</p>
            </>
          )}
        </div>

        <h1 className="font-yatra text-2xl text-[#7A1F28] text-center mb-1">Complete Your Profile</h1>
        <p className="text-sm text-[#9C7D5A] text-center mb-6">Required to access the registration portal</p>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C3D2E] mb-1.5">
              Full Name — as per your Student ID Card
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] focus-within:border-[#C9943A] transition-all">
              <span className="text-[#9C7D5A] text-sm">✎</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jhon Doe"
                className="flex-1 bg-transparent outline-none text-sm text-[#2B1A0E] placeholder:text-[#C4A882]"
              />
            </div>
            {isGoogleUser && (
              <p className="text-xs text-[#9C7D5A] mt-1">
                Pre-filled from Google — edit if it doesn&apos;t match your Student ID card
              </p>
            )}
          </div>

          {/* Student Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C3D2E] mb-1.5">
              Student Number
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] focus-within:border-[#C9943A] transition-all">
              <span className="text-[#9C7D5A] text-sm">#</span>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="e.g. SAXXXXXXXX"
                className="flex-1 bg-transparent outline-none text-sm text-[#2B1A0E] placeholder:text-[#C4A882] uppercase"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#8B1A1A] bg-[#8B1A1A]/8 border border-[#8B1A1A]/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 mt-2"
            style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#F5E4B8' }}
          >
            {saving && <LoadingSpinner size={16} color="#F5E4B8" />}
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
