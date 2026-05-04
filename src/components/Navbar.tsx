import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { Ticket } from 'lucide-react'
import AvatarCircle from '@/components/ui/AvatarCircle'
import SignOutButton from '@/components/SignOutButton'

interface Profile {
  full_name: string | null
  avatar_url: string | null
  avatar_initial: string | null
  is_admin: boolean
}

export default async function Navbar() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  let profile: Profile | null = null
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, avatar_initial, is_admin')
      .eq('id', session.user.id)
      .single()
    profile = data
  }

  const isAdmin = profile?.is_admin === true
  const displayName = profile?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? ''
  const initial = profile?.avatar_initial ?? displayName.charAt(0).toUpperCase() ?? 'U'

  return (
    <nav
      className="sticky top-0 z-[100] h-16 flex items-center justify-between px-4 md:px-6"
      style={{
        background: 'linear-gradient(135deg, #4E1219 0%, #7A1F28 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-3 flex-shrink-0">
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#E8BC6A] shadow-md">
          <Image
            src="/logo.png"
            alt="Awurudu 2026"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div>
          <div
            className="font-yatra text-[1.05rem] tracking-wide leading-tight"
            style={{ color: '#E8BC6A' }}
          >
            Awurudu&apos;26
          </div>
          <div className="text-[0.65rem] leading-tight" style={{ color: 'rgba(245,228,184,0.55)' }}>
            SCU
          </div>
        </div>
      </Link>

      {/* Nav Tabs — shown when logged in */}
      {session && (
        <div className="hidden md:flex items-center gap-1">
          {!isAdmin && (
            <NavTab href="/dashboard#my-ticket" icon={<Ticket size={14} />} label="My Ticket" />
          )}
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {session && profile ? (
          <>
            <div className="hidden sm:flex items-center gap-2">
              <AvatarCircle
                avatarUrl={profile.avatar_url}
                initial={initial}
                size={34}
              />
              <span className="text-sm font-medium" style={{ color: '#F5E4B8' }}>
                {displayName}
              </span>
            </div>
            <div className="sm:hidden">
              <AvatarCircle avatarUrl={profile.avatar_url} initial={initial} size={32} />
            </div>
            <SignOutButton />
          </>
        ) : !session ? (
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #C9943A, #B8832A)',
              color: '#FAF3E0',
            }}
          >
            Sign In
          </Link>
        ) : null}
      </div>
    </nav>
  )
}

function NavTab({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.82rem] font-medium transition-all duration-200 text-[rgba(245,228,184,0.75)] hover:text-[#E8BC6A] hover:bg-[rgba(201,148,58,0.18)]"
    >
      {icon}
      {label}
    </Link>
  )
}
