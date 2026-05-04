import { supabaseAdmin } from '@/lib/supabase-server'
import Image from 'next/image'
import { Calendar, MapPin, Clock, CheckCircle2, XCircle, AlertTriangle, Ticket } from 'lucide-react'

interface Props {
  params: { token: string }
}

interface RegistrationLookup {
  id: string
  qr_used: boolean
  qr_used_at: string | null
  qr_token: string
  profiles: {
    full_name: string
    student_number: string
    email: string
  } | null
}

interface RawRegistrationLookup {
  id: string
  qr_used: boolean
  qr_used_at: string | null
  qr_token: string
  profiles: RegistrationLookup['profiles'] | RegistrationLookup['profiles'][]
}

export default async function VerifyPage({ params }: Props) {
  const normalizedToken = decodeURIComponent(params.token).trim().replace(/\/$/, '')

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('id, qr_used, qr_used_at, qr_token, profiles:profiles!registrations_user_id_fkey(full_name, student_number, email)')
    .eq('qr_token', normalizedToken)
    .maybeSingle()

  if (error) {
    console.error('Verify page QR lookup failed:', error)
  }

  if (!reg) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl border border-[#EEE2C8] bg-white p-8 text-center shadow-2xl">
            <div className="absolute left-0 right-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(139,26,26,0.1)', border: '2px solid rgba(139,26,26,0.3)' }}>
              <XCircle size={32} className="text-[#8B1A1A]" />
            </div>
            <h1 className="mb-2 font-yatra text-2xl text-[#8B1A1A]">Invalid QR Code</h1>
            <p className="text-sm text-[#5C3D2E]">This QR code is not valid or does not exist. Please contact an organiser if you believe this is an error.</p>
          </div>
        </div>
      </div>
    )
  }

  const rawRegistration = reg as unknown as RawRegistrationLookup
  const registration: RegistrationLookup = {
    ...rawRegistration,
    profiles: Array.isArray(rawRegistration.profiles) ? rawRegistration.profiles[0] ?? null : rawRegistration.profiles ?? null,
  }

  if (registration.qr_used) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl border border-[#EEE2C8] bg-white p-8 text-center shadow-2xl">
            <div className="absolute left-0 right-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(139,105,20,0.1)', border: '2px solid rgba(139,105,20,0.3)' }}>
              <AlertTriangle size={32} className="text-[#8B6914]" />
            </div>
            <h1 className="mb-2 font-yatra text-2xl text-[#8B6914]">Ticket Already Used</h1>
            <p className="mb-1 text-sm text-[#5C3D2E]">This ticket has already been scanned at the gate.</p>
            {registration.qr_used_at && (
              <p className="text-xs text-[#9C7D5A]">
                Used at: {new Date(registration.qr_used_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const profile = registration.profiles

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#C9943A] bg-white shadow-2xl">
          <div className="absolute left-0 right-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />

          <div className="p-6 text-center" style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}>
            <div className="relative mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-[#E8BC6A]">
              <Image src="/logo.png" alt="Awurudu 2026" fill className="object-cover" />
            </div>
            <h1 className="font-yatra text-xl text-[#E8BC6A]">Awurudu 2026</h1>
            <p className="mt-1 text-xs" style={{ color: 'rgba(245,228,184,0.7)' }}>SCU - Entry Pass</p>
          </div>

          <div className="flex justify-center border-b border-[#EEE2C8] py-3">
            <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: 'rgba(45,122,58,0.1)', color: '#2D7A3A', border: '1px solid rgba(45,122,58,0.25)' }}>
              <CheckCircle2 size={16} />
              Valid Ticket
            </div>
          </div>

          <div className="p-6">
            <div className="mb-5 text-center">
              <p className="text-lg font-bold text-[#2B1A0E]">{profile?.full_name}</p>
              <p className="text-sm text-[#9C7D5A]">{profile?.student_number}</p>
              <p className="text-xs text-[#9C7D5A]">{profile?.email}</p>
            </div>

            <div className="space-y-3 border-t border-[#EEE2C8] pt-4">
              {[
                { icon: <Calendar size={14} />, label: 'Date', value: '8th May 2026' },
                { icon: <MapPin size={14} />, label: 'Venue', value: 'BMICH Hidden Escape, Colombo' },
                { icon: <Clock size={14} />, label: 'Time', value: '9:00 AM onwards' },
                { icon: <Ticket size={14} />, label: 'Ticket Price', value: 'LKR 850' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#C9943A]" style={{ background: 'rgba(201,148,58,0.1)' }}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wider text-[#9C7D5A]">{label}</p>
                    <p className="text-sm font-medium text-[#2B1A0E]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl px-4 py-3 text-center text-sm font-medium text-[#5C3D2E]" style={{ background: 'rgba(201,148,58,0.1)', border: '1px solid rgba(201,148,58,0.25)' }}>
              Present this page at the entrance on event day
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
