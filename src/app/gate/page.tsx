'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScanLine, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Camera, RotateCcw } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface ScanResult {
  valid: boolean
  message: string
  student?: { full_name: string; student_number: string }
  usedAt?: string
}

type Html5QrcodeInstance = {
  start: (
    cameraIdOrConfig: string | { facingMode: 'user' | 'environment' },
    config: { fps?: number; qrbox?: { width: number; height: number }; aspectRatio?: number },
    onSuccess: (decodedText: string) => void | Promise<void>,
    onError?: (errorMessage: string) => void
  ) => Promise<unknown>
  stop: () => Promise<unknown>
  clear: () => Promise<unknown>
  isScanning?: boolean
}

interface CameraDevice {
  id: string
  label: string
}

const SCANNER_ELEMENT_ID = 'qr-reader'

function extractToken(decodedText: string) {
  const trimmed = decodedText.trim()

  try {
    const parsed = new URL(trimmed)
    const verifyIndex = parsed.pathname.indexOf('/verify/')
    if (verifyIndex >= 0) {
      return parsed.pathname.slice(verifyIndex + '/verify/'.length).replace(/^\/+|\/+$/g, '')
    }
  } catch {
    // Continue with plain text parsing below.
  }

  return trimmed.replace(/\/$/, '').split('/verify/').pop() ?? trimmed
}

export default function GatePage() {
  const scannerRef = useRef<Html5QrcodeInstance | null>(null)
  const mountedRef = useRef(true)
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [starting, setStarting] = useState(true)
  const [scannerStarted, setScannerStarted] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return

    try {
      await scannerRef.current.stop()
    } catch {
      // Ignore stop errors when scanner isn't active.
    }

    try {
      await scannerRef.current.clear()
    } catch {
      // Ignore cleanup errors.
    }

    scannerRef.current = null
    if (mountedRef.current) {
      setScannerStarted(false)
    }
  }, [])

  const startScanner = useCallback(async () => {
    setStarting(true)
    setCameraError('')

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }

    await stopScanner()

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mountedRef.current) return

      const rawCameras = await Html5Qrcode.getCameras().catch(() => [])
      const cameras: CameraDevice[] = (rawCameras ?? []).map((camera: { id?: string; deviceId?: string; label?: string }) => ({
        id: camera.id || camera.deviceId || '',
        label: camera.label || 'Camera',
      })).filter((camera) => camera.id)

      if (mountedRef.current) {
        setAvailableCameras(cameras)
      }

      const preferredBackCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label))
      const fallbackCamera = cameras[0]
      const cameraToUse = selectedCameraId || preferredBackCamera?.id || fallbackCamera?.id

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID) as unknown as Html5QrcodeInstance
      scannerRef.current = scanner

      const scanSuccess = async (decodedText: string) => {
        const token = extractToken(decodedText)
        if (!token) return

        await stopScanner()

        const response = await fetch('/api/scan-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data: ScanResult = await response.json()
        if (!mountedRef.current) return

        setResult(data)
        setScanCount((prev) => prev + 1)

        resumeTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          setResult(null)
          startScanner()
        }, 4000)
      }

      const scanError = () => {
        // Ignore noisy per-frame scan errors.
      }

      let started = false

      if (cameraToUse) {
        try {
          await scanner.start(
            cameraToUse,
            { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
            scanSuccess,
            scanError
          )
          started = true
          if (mountedRef.current) {
            setSelectedCameraId(cameraToUse)
          }
        } catch (deviceStartError) {
          console.warn('Starting selected camera failed, falling back to facingMode:', deviceStartError)
        }
      }

      if (!started) {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          scanSuccess,
          scanError
        )
      }

      if (!mountedRef.current) return
      setScannerStarted(true)
    } catch (error) {
      console.error('Failed to start gate scanner:', error)
      if (!mountedRef.current) return
      setCameraError('Camera could not be started. Please allow camera permission and refresh the scanner.')
    } finally {
      if (mountedRef.current) {
        setStarting(false)
      }
    }
  }, [selectedCameraId, stopScanner])

  useEffect(() => {
    mountedRef.current = true
    startScanner()

    return () => {
      mountedRef.current = false
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
      stopScanner()
    }
  }, [startScanner, stopScanner])

  return (
    <div className="min-h-[calc(100vh-70px)] mx-auto flex max-w-lg flex-col items-center px-4 py-6">
      <div className="w-full">
        <div className="mb-4 text-center">
          <h1 className="font-yatra text-2xl text-[#7A1F28]">Gate Entry</h1>
          <p className="text-sm text-[#9C7D5A]">Awurudu 2026 - BMICH Hidden Escape</p>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: 'rgba(201,148,58,0.15)', color: '#8B6914', border: '1px solid rgba(201,148,58,0.3)' }}>
            <ScanLine size={14} />
            {scanCount} {scanCount === 1 ? 'entry' : 'entries'} processed this session
          </div>
        </div>

        {!result && (
          <div className="mb-4 overflow-hidden rounded-2xl border-2 border-[#C9943A] shadow-xl" style={{ background: '#2B1A0E' }}>
            <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}>
              <p className="text-sm font-medium" style={{ color: '#F5E4B8' }}>
                {starting ? 'Starting camera...' : scannerStarted ? "Point the camera at a student's QR code" : 'Camera unavailable'}
              </p>
            </div>
            <div className="min-h-[320px] bg-black">
              {starting && (
                <div className="flex h-[320px] items-center justify-center">
                  <LoadingSpinner size={30} color="#E8BC6A" />
                </div>
              )}
              <div id={SCANNER_ELEMENT_ID} className={starting ? 'hidden' : 'w-full'} />
            </div>
            {!starting && availableCameras.length > 1 && (
              <div className="flex flex-col gap-2 border-t border-[#C9943A]/25 bg-[#1A120E] p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F5E4B8]/80">
                  Active Camera
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value)
                    setResult(null)
                    setCameraError('')
                    setTimeout(() => {
                      startScanner()
                    }, 0)
                  }}
                  className="rounded-xl border border-[#C9943A]/30 bg-[#FAF3E0] px-3 py-2 text-sm text-[#2B1A0E] outline-none focus:border-[#C9943A]"
                >
                  {availableCameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {cameraError && !result && (
          <div className="mb-4 rounded-2xl border border-[#8B1A1A]/20 bg-[#8B1A1A]/8 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-[#8B1A1A]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#8B1A1A]">Camera unavailable</p>
                <p className="mt-1 text-sm text-[#8B1A1A]">{cameraError}</p>
              </div>
            </div>
            <button
              onClick={startScanner}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7A1F28] px-4 py-2.5 text-sm font-semibold text-[#F5E4B8] transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
            >
              <RotateCcw size={14} />
              Retry Camera
            </button>
          </div>
        )}

        {result && (
          <div
            className="mb-4 rounded-2xl border-2 p-8 text-center shadow-2xl"
            style={{
              background: result.valid ? 'rgba(45,122,58,0.08)' : 'rgba(139,26,26,0.08)',
              borderColor: result.valid ? '#2D7A3A' : '#8B1A1A',
            }}
          >
            <div className="mb-4 flex justify-center">
              {result.valid
                ? <CheckCircle2 size={64} className="text-[#2D7A3A]" />
                : <XCircle size={64} className="text-[#8B1A1A]" />}
            </div>

            <h2
              className="mb-2 font-yatra text-2xl"
              style={{ color: result.valid ? '#2D7A3A' : '#8B1A1A' }}
            >
              {result.valid ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </h2>

            {result.student && (
              <div className="mt-3">
                <p className="text-lg font-bold text-[#2B1A0E]">{result.student.full_name}</p>
                <p className="text-sm text-[#9C7D5A]">{result.student.student_number}</p>
              </div>
            )}

            <p className="mt-2 text-sm font-medium" style={{ color: result.valid ? '#2D7A3A' : '#8B1A1A' }}>
              {result.message}
              {!result.valid && result.usedAt && ` - Used at ${new Date(result.usedAt).toLocaleTimeString('en-LK')}`}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#9C7D5A]">
              <RefreshCw size={12} className="animate-spin" />
              Scanner resuming in 4 seconds...
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[rgba(201,148,58,0.12)] bg-white p-4 text-center shadow-sm">
          <div className="flex items-start gap-3 text-left">
            <Camera size={16} className="mt-0.5 flex-shrink-0 text-[#C9943A]" />
            <p className="text-xs text-[#9C7D5A]">
              Valid QR codes are from <strong className="text-[#5C3D2E]">approved</strong> registrations only.
              Each code is single use - used codes will be denied.
            </p>
          </div>
        </div>
      </div>
      <style jsx global>{`
        #${SCANNER_ELEMENT_ID} {
          width: 100% !important;
          min-height: 320px;
          background: #000;
        }

        #${SCANNER_ELEMENT_ID} video {
          display: block !important;
          width: 100% !important;
          height: 320px !important;
          object-fit: cover !important;
          background: #000 !important;
        }

        #${SCANNER_ELEMENT_ID} canvas {
          display: none !important;
        }

        #${SCANNER_ELEMENT_ID} img {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
