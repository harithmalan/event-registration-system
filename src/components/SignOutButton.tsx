'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createBrowserClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#F5E4B8] hover:text-[#E8BC6A] hover:bg-white/10 transition-all duration-200"
    >
      <LogOut size={13} />
      Sign Out
    </button>
  )
}
