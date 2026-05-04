'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase-browser'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function RegisterPage() {
  const supabase = createBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) { setError(authError.message) } else { setSuccess(true) }
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    setGoogleLoading(false)
  }

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )

  const inputClass = "w-full pl-9 pr-4 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] text-sm text-[#2B1A0E] placeholder-[#9C7D5A] outline-none focus:border-[#C9943A] focus:shadow-[0_0_0_3px_rgba(201,148,58,0.12)] focus:bg-white transition-all"

  if (success) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-[#EEE2C8] text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(45,122,58,0.1)', border: '2px solid rgba(45,122,58,0.3)' }}>
              <CheckCircle2 size={32} className="text-[#2D7A3A]" />
            </div>
            <h2 className="font-yatra text-2xl text-[#7A1F28] mb-2">Check Your Email</h2>
            <p className="text-sm text-[#5C3D2E] mb-2">Verification link sent to <strong>{email}</strong>.</p>
            <p className="text-sm text-[#9C7D5A]">Click the link in your email to verify your account and complete registration.</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[#7A1F28] hover:underline">Back to Sign In</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-[#EEE2C8] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
          <div className="flex flex-col items-center mb-7">
            <Image src="/logo.png" alt="Awurudu 2026" width={72} height={72} className="rounded-full border-2 border-[#E8BC6A] shadow-lg mb-4" style={{ objectFit: 'cover' }} />
            <h1 className="font-yatra text-2xl text-[#7A1F28]">Join Awurudu 2026</h1>
            <p className="text-sm text-[#9C7D5A] mt-1">Create your account</p>
          </div>
          <button id="google-register-btn" onClick={handleGoogle} disabled={googleLoading} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-white text-[#2B1A0E] text-sm font-medium hover:bg-[#FAF3E0] hover:border-[#C9943A] transition-all disabled:opacity-60 mb-4">
            {googleLoading ? <LoadingSpinner size={18} color="#7A1F28" /> : <GoogleIcon />}
            Continue with Google
          </button>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#EEE2C8]" />
            <span className="text-xs text-[#9C7D5A]">or register with email</span>
            <div className="flex-1 h-px bg-[#EEE2C8]" />
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[0.75rem] font-semibold text-[#5C3D2E] mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" /><input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sliit.lk" required className={inputClass} /></div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-semibold text-[#5C3D2E] mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" /><input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required className={inputClass} /></div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-semibold text-[#5C3D2E] mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" /><input id="register-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required className={inputClass} /></div>
            </div>
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#8B1A1A]/8 border border-[#8B1A1A]/20">
                <AlertCircle size={15} className="text-[#8B1A1A] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#8B1A1A]">{error}</p>
              </div>
            )}
            <button id="register-submit-btn" type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#F5E4B8', boxShadow: '0 2px 12px rgba(122,31,40,0.3)' }}>
              {loading && <LoadingSpinner size={16} color="#F5E4B8" />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center mt-5 text-sm text-[#9C7D5A]">Already have an account?{' '}<Link href="/login" className="text-[#7A1F28] font-semibold hover:underline">Sign In</Link></p>
        </div>
      </div>
    </div>
  )
}
