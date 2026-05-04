import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { Calendar, MapPin, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface Props {
  params: { token: string }
}

export default async function VerifyPage({ params }: Props) {
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

  const { data: reg } = await supabase
    .from('registrations')
    .select('id, qr_used, qr_used_at, qr_token, profiles(full_name, student_number, email)')
    .eq('qr_token', params.token)
    .single()

  // Not found
  if (!reg) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="relative bg-white rounded-2xl p-8 text-center shadow-2xl border border-[#EEE2C8] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,26,26,0.1)', border: '2px solid rgba(139,26,26,0.3)' }}>
              <XCircle size={32} className="text-[#8B1A1A]" />
            </div>
            <h1 className="font-yatra text-2xl text-[#8B1A1A] mb-2">Invalid QR Code</h1>
            <p className="text-sm text-[#5C3D2E]">This QR code is not valid or does not exist. Please contact an organiser if you believe this is an error.</p>
          </div>
        </div>
      </div>
    )
  }

  // Already used
  if (reg.qr_used) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="relative bg-white rounded-2xl p-8 text-center shadow-2xl border border-[#EEE2C8] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,105,20,0.1)', border: '2px solid rgba(139,105,20,0.3)' }}>
              <AlertTriangle size={32} className="text-[#8B6914]" />
            </div>
            <h1 className="font-yatra text-2xl text-[#8B6914] mb-2">Ticket Already Used</h1>
            <p className="text-sm text-[#5C3D2E] mb-1">This ticket has already been scanned at the gate.</p>
            {reg.qr_used_at && (
              <p className="text-xs text-[#9C7D5A]">
                Used at: {new Date(reg.qr_used_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const profile = reg.profiles as unknown as { full_name: string; student_number: string; email: string } | null

  // Valid ticket
  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-[#C9943A]">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />

          {/* Header */}
          <div className="p-6 text-center" style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}>
            <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-[#E8BC6A] mb-3">
              <Image src="/logo.png" alt="Awurudu 2026" fill className="object-cover" />
            </div>
            <h1 className="font-yatra text-xl text-[#E8BC6A]">Awurudu 2026</h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(245,228,184,0.7)' }}>SLIIT City University — Entry Pass</p>
          </div>

          {/* Valid badge */}
          <div className="flex justify-center py-3 border-b border-[#EEE2C8]">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background: 'rgba(45,122,58,0.1)', color: '#2D7A3A', border: '1px solid rgba(45,122,58,0.25)' }}>
              <CheckCircle2 size={16} />
              Valid Ticket
            </div>
          </div>

          {/* Ticket details */}
          <div className="p-6">
            <div className="text-center mb-5">
              <p className="font-bold text-lg text-[#2B1A0E]">{profile?.full_name}</p>
              <p className="text-sm text-[#9C7D5A]">{profile?.student_number}</p>
              <p className="text-xs text-[#9C7D5A]">{profile?.email}</p>
            </div>

            <div className="space-y-3 border-t border-[#EEE2C8] pt-4">
              {[
                { icon: <Calendar size={14} />, label: 'Date', value: '8th May 2026' },
                { icon: <MapPin size={14} />, label: 'Venue', value: 'BMICH Kamatha, Colombo' },
                { icon: <Clock size={14} />, label: 'Time', value: '9:00 AM onwards' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[#C9943A]" style={{ background: 'rgba(201,148,58,0.1)' }}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wider text-[#9C7D5A]">{label}</p>
                    <p className="text-sm font-medium text-[#2B1A0E]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 px-4 py-3 rounded-xl text-center text-sm font-medium text-[#5C3D2E]" style={{ background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.25)' }}>
              Present this page at the entrance on event day
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
