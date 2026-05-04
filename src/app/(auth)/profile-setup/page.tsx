'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRound, Hash, AlertCircle, Check } from 'lucide-react'
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

      const googleAvatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
      const googleName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
      const isGoogle = !!googleAvatar

      setIsGoogleUser(isGoogle)

      if (isGoogle) {
        setAvatarUrl(googleAvatar)
        setFullName(googleName)
      }

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
        avatar_url: isGoogleUser ? avatarUrl : null,
      }, { onConflict: 'id' })

    if (upsertError) {
      setError(upsertError.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  const initial = fullName.trim().charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase() || 'U'

  if (loading) {
    return (
      <div className="festival-surface flex min-h-screen items-center justify-center bg-[#FAF3E0]">
        <div className="festival-pulse rounded-full">
          <LoadingSpinner size={36} color="#7A1F28" />
        </div>
      </div>
    )
  }

  return (
    <div className="festival-surface flex min-h-screen items-center justify-center bg-[#FAF3E0] px-4 py-8">
      <div className="festival-entrance w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-[#EEE2C8] bg-white p-8 shadow-xl">
          <div className="absolute left-0 right-0 top-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />

          <div className="mb-6 flex items-center justify-center gap-2">
            {[
              { n: 1, label: 'Account', done: true },
              { n: 2, label: 'Profile', active: true },
              { n: 3, label: 'Payment' },
            ].map(({ n, label, done, active }, i) => (
              <div key={n} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-[#EEE2C8]" />}
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    done ? 'border-[#2D7A3A] bg-[#2D7A3A] text-white' :
                    active ? 'festival-glow border-[#C9943A] bg-white text-[#C9943A]' :
                    'border-[#EEE2C8] bg-white text-[#9C7D5A]'
                  }`}
                >
                  {done ? <Check size={13} /> : n}
                </div>
                <span className={`text-xs ${active ? 'font-semibold text-[#7A1F28]' : 'text-[#9C7D5A]'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="mb-6 flex flex-col items-center">
            {isGoogleUser && avatarUrl ? (
              <>
                <div className={`relative h-20 w-20 overflow-hidden rounded-full border-4 border-[#C9943A] shadow-lg ${loading ? 'festival-pulse' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt="Google profile"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="mt-2 text-xs text-[#9C7D5A]">Profile picture from Google</p>
              </>
            ) : (
              <>
                <div
                  className="h-20 w-20 rounded-full border-4 border-[#E8BC6A] shadow-lg font-bold text-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}
                >
                  {initial}
                </div>
                <p className="mt-2 text-xs text-[#9C7D5A]">Avatar auto-generated from your name</p>
              </>
            )}
          </div>

          <div className="festival-entrance-delayed">
            <h1 className="mb-1 text-center font-yatra text-2xl text-[#7A1F28]">Complete Your Profile</h1>
            <p className="mb-6 text-center text-sm text-[#9C7D5A]">Required to access the registration portal</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C3D2E]">
                  Full Name - as per your Student ID Card
                </label>
                <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-3 py-2.5 transition-all focus-within:border-[#C9943A]">
                  <UserRound size={16} className="text-[#9C7D5A]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="flex-1 bg-transparent text-sm text-[#2B1A0E] outline-none placeholder:text-[#C4A882]"
                  />
                </div>
                {isGoogleUser && (
                  <p className="mt-1 text-xs text-[#9C7D5A]">
                    Pre-filled from Google - edit if it does not match your Student ID card
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C3D2E]">
                  Student Number
                </label>
                <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] px-3 py-2.5 transition-all focus-within:border-[#C9943A]">
                  <Hash size={16} className="text-[#9C7D5A]" />
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="e.g. SAXXXXXXXX"
                    className="flex-1 bg-transparent text-sm uppercase text-[#2B1A0E] outline-none placeholder:text-[#C4A882]"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-[#8B1A1A]/20 bg-[#8B1A1A]/8 px-3 py-2.5">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-[#8B1A1A]" />
                  <p className="text-xs text-[#8B1A1A]">{error}</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#F5E4B8' }}
              >
                {saving && <LoadingSpinner size={16} color="#F5E4B8" />}
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
