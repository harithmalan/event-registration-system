'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase-browser'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        router.push('/login')
        return
      }

      router.push('/profile-setup')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setGoogleLoading(false)
  }

  async function handleFacebook() {
    setFacebookLoading(true)
    setError('')
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (oauthError) {
        setError(oauthError.message)
        setFacebookLoading(false)
        return
      }
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Facebook login error:', err)
      setError('Facebook login failed. Please try again.')
      setFacebookLoading(false)
    }
  }

  const inputClass = 'w-full pl-9 pr-4 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] text-sm text-[#2B1A0E] placeholder-[#9C7D5A] outline-none focus:border-[#C9943A] focus:shadow-[0_0_0_3px_rgba(201,148,58,0.12)] focus:bg-white transition-all'

  return (
    <div className="festival-surface min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md festival-entrance">
        <div
          className="relative overflow-hidden rounded-2xl border border-[#EEE2C8] bg-white p-8 shadow-2xl"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,148,58,0.12), transparent 70%)' }}
        >
          <div className="absolute left-0 right-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
          <div className="absolute left-4 top-4 opacity-50 text-[#C9943A]" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l1.8 5.2H19l-4.2 3 1.6 5L12 12.8 7.6 15.2l1.6-5L5 7.2h5.2L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute bottom-4 right-4 rotate-180 opacity-40 text-[#C9943A]" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l1.8 5.2H19l-4.2 3 1.6 5L12 12.8 7.6 15.2l1.6-5L5 7.2h5.2L12 2Z" fill="currentColor" />
            </svg>
          </div>

          <div className="mb-7 flex flex-col items-center">
            <Image src="/logo.png" alt="Awurudu 2026" width={72} height={72} className="festival-float mb-4 rounded-full border-2 border-[#E8BC6A] shadow-lg" style={{ objectFit: 'cover' }} />
            <h1 className="font-yatra text-2xl text-[#7A1F28]">Join Awurudu 2026</h1>
            <p className="mt-1 text-sm text-[#9C7D5A]">Create your account</p>
          </div>

          <button
            id="google-register-btn"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="festival-shimmer mb-4 flex w-full items-center justify-center gap-3 rounded-xl border-[1.5px] border-[#EEE2C8] bg-white px-4 py-2.5 text-sm font-medium text-[#2B1A0E] transition-all duration-200 hover:border-[#C9943A] hover:bg-[#FAF3E0] active:scale-95 disabled:opacity-60"
          >
            {googleLoading ? <LoadingSpinner size={18} color="#7A1F28" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button
            onClick={handleFacebook}
            disabled={facebookLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-white text-[#2B1A0E] text-sm font-medium hover:bg-[#E8F0FE] hover:border-[#1877F2] transition-all duration-200 disabled:opacity-60 mb-4"
          >
            {facebookLoading ? <LoadingSpinner size={18} color="#1877F2" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
            {facebookLoading ? 'Redirecting...' : 'Continue with Facebook'}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#EEE2C8]" />
            <span className="text-xs text-[#9C7D5A]">or register with email</span>
            <div className="h-px flex-1 bg-[#EEE2C8]" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[0.75rem] font-semibold uppercase tracking-wider text-[#5C3D2E]">Email Address</label>
              <div className="relative rounded-xl border-l-[3px] border-transparent transition-all focus-within:border-[#C9943A]">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
                <input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sliit.lk" required className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[0.75rem] font-semibold uppercase tracking-wider text-[#5C3D2E]">Password</label>
              <div className="relative rounded-xl border-l-[3px] border-transparent transition-all focus-within:border-[#C9943A]">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
                <input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[0.75rem] font-semibold uppercase tracking-wider text-[#5C3D2E]">Confirm Password</label>
              <div className="relative rounded-xl border-l-[3px] border-transparent transition-all focus-within:border-[#C9943A]">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
                <input id="register-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required className={inputClass} />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-[#8B1A1A]/20 bg-[#8B1A1A]/8 px-3 py-2.5">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-[#8B1A1A]" />
                <p className="text-xs text-[#8B1A1A]">{error}</p>
              </div>
            )}

            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#F5E4B8', boxShadow: '0 2px 12px rgba(122,31,40,0.3)' }}
            >
              {loading && <LoadingSpinner size={16} color="#F5E4B8" />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#9C7D5A]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#7A1F28] hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
