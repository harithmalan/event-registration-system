'use client'

import { useEffect, useRef, useState } from 'react'
import { ScanLine, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

interface ScanResult {
  valid: boolean
  message: string
  student?: { full_name: string; student_number: string }
  usedAt?: string
}

export default function GatePage() {
  const scannerRef = useRef<unknown>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [scannerStarted, setScannerStarted] = useState(false)
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null

    async function initScanner() {
      const { Html5QrcodeScanner } = await import('html5-qrcode')

      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        false
      )

      scanner.render(
        async (decodedText: string) => {
          const token = decodedText.split('/verify/')[1] ?? decodedText
          if (!token) return

          try { scanner?.clear() } catch { /* ignore */ }

          const res = await fetch('/api/scan-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })
          const data: ScanResult = await res.json()
          setResult(data)
          setScanCount(prev => prev + 1)

          resumeTimeout.current = setTimeout(async () => {
            setResult(null)
            try {
              const { Html5QrcodeScanner: Scanner } = await import('html5-qrcode')
              const newScanner = new Scanner('qr-reader', { fps: 10, qrbox: { width: 220, height: 220 } }, false)
              newScanner.render(async () => {}, () => {})
              scannerRef.current = newScanner
            } catch { /* ignore */ }
          }, 4000)
        },
        () => { /* ignore qr errors */ }
      )

      scannerRef.current = scanner
      setScannerStarted(true)
    }

    initScanner()

    return () => {
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current)
      try {
        if (scanner) scanner.clear()
      } catch { /* ignore */ }
    }
  }, [])

  return (
    <div className="min-h-[calc(100vh-70px)] flex flex-col items-center px-4 py-6 max-w-lg mx-auto">
      <div className="w-full">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="font-yatra text-2xl text-[#7A1F28]">Gate Entry</h1>
          <p className="text-sm text-[#9C7D5A]">Awurudu 2026 — BMICH Kamatha</p>
        </div>

        {/* Scan count */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: 'rgba(201,148,58,0.15)', color: '#8B6914', border: '1px solid rgba(201,148,58,0.3)' }}>
            <ScanLine size={14} />
            {scanCount} {scanCount === 1 ? 'entry' : 'entries'} processed this session
          </div>
        </div>

        {/* Scanner */}
        {!result && (
          <div
            className="rounded-2xl overflow-hidden border-2 border-[#C9943A] shadow-xl mb-4"
            style={{ background: '#2B1A0E' }}
          >
            <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}>
              <p className="text-sm font-medium" style={{ color: '#F5E4B8' }}>
                {scannerStarted ? 'Point the camera at a student\'s QR code' : 'Starting camera...'}
              </p>
            </div>
            <div id="qr-reader" className="w-full" />
          </div>
        )}

        {/* Result overlay */}
        {result && (
          <div
            className="rounded-2xl p-8 text-center shadow-2xl border-2 mb-4"
            style={{
              background: result.valid ? 'rgba(45,122,58,0.08)' : 'rgba(139,26,26,0.08)',
              borderColor: result.valid ? '#2D7A3A' : '#8B1A1A',
            }}
          >
            <div className="flex justify-center mb-4">
              {result.valid
                ? <CheckCircle2 size={64} className="text-[#2D7A3A]" />
                : <XCircle size={64} className="text-[#8B1A1A]" />}
            </div>

            <h2
              className="font-yatra text-2xl mb-2"
              style={{ color: result.valid ? '#2D7A3A' : '#8B1A1A' }}
            >
              {result.valid ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </h2>

            {result.student && (
              <div className="mt-3">
                <p className="font-bold text-lg text-[#2B1A0E]">{result.student.full_name}</p>
                <p className="text-sm text-[#9C7D5A]">{result.student.student_number}</p>
              </div>
            )}

            {!result.valid && (
              <p className="mt-2 text-sm font-medium" style={{ color: '#8B1A1A' }}>
                {result.message}
                {result.usedAt && ` — Used at ${new Date(result.usedAt).toLocaleTimeString('en-LK')}`}
              </p>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#9C7D5A]">
              <RefreshCw size={12} className="animate-spin" />
              Scanner resuming in 4 seconds...
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(201,148,58,0.12)] shadow-sm text-center">
          <p className="text-xs text-[#9C7D5A]">
            Valid QR codes are from <strong className="text-[#5C3D2E]">approved</strong> registrations only.
            Each code is single use — used codes will be denied.
          </p>
        </div>
      </div>
    </div>
  )
}
