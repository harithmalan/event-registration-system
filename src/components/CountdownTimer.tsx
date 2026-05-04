'use client'

import { useState, useEffect } from 'react'
import { getTimeUntilEvent } from '@/lib/utils'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeUntilEvent())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilEvent())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Mins', value: timeLeft.minutes },
    { label: 'Secs', value: timeLeft.seconds },
  ]

  return (
    <div className="flex gap-3 flex-wrap">
      {units.map(({ label, value }) => (
        <div
          key={label}
          className="festival-flip text-center min-w-[74px] rounded-xl px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(201,148,58,0.35)',
          }}
        >
          <div
            className="font-yatra text-[1.75rem] leading-none"
            style={{ color: '#E8BC6A' }}
          >
            <span key={`${label}-${value}`} className="festival-flip-value">
              {String(value).padStart(2, '0')}
            </span>
          </div>
          <div
            className="text-[0.65rem] uppercase tracking-widest mt-1"
            style={{ color: 'rgba(245,228,184,0.6)' }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}
