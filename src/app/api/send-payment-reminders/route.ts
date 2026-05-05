import nodemailer from 'nodemailer'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  }
})

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
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
}

function getReminderHtml(studentName: string) {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:sans-serif;background:#FAF3E0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #EEE2C8">
  <tr><td style="background:linear-gradient(135deg,#4E1219,#7A1F28);padding:28px;text-align:center">
    <h1 style="color:#E8BC6A;font-size:24px;margin:0">Awurudu 2026</h1>
    <p style="color:#F5E4B8;font-size:13px;margin:6px 0 0">Payment Reminder - Please Complete Your Ticket Confirmation</p>
  </td></tr>
  <tr><td style="padding:32px;background:#FAF3E0">
    <p style="color:#2B1A0E">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#5C3D2E">Our records show that your payment receipt has not yet been uploaded and approved in the Awurudu 2026 system.</p>
    <p style="color:#8B1A1A;font-weight:700">Please hurry and complete your ticket confirmation before the final selling and verification windows close.</p>

    <div style="background:#fff;border:1px solid rgba(201,148,58,0.3);border-radius:14px;padding:18px;margin:18px 0">
      <p style="margin:0 0 10px;color:#7A1F28;font-size:14px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase">Bank Details for Online Deposits</p>
      <p style="margin:0;color:#5C3D2E;line-height:1.8">
        <strong>Account Name:</strong> M/S SLIIT COMPUTING INTERACTIVE<br/>
        <strong>Account Number:</strong> 73031923<br/>
        <strong>Bank:</strong> Bank of Ceylon, Kollupitiya Branch
      </p>
      <p style="margin:12px 0 0;color:#5C3D2E">After making the deposit, please log in to the website and upload the deposit slip or receipt for approval.</p>
    </div>

    <div style="background:#fff;border:1px solid rgba(45,90,39,0.22);border-radius:14px;padding:18px;margin:18px 0">
      <p style="margin:0 0 10px;color:#2D5A27;font-size:14px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase">Physical Ticket Selling Schedule</p>
      <p style="margin:0;color:#5C3D2E;line-height:1.9">
        <strong>2026/05/06:</strong> 12:00 Noon - 2:00 PM<br/>
        <strong>2026/05/07:</strong> 12:00 Noon - 2:00 PM<br/>
        <strong>At Gate (Event Day):</strong> 9:00 AM - 10:00 AM
      </p>
    </div>

    <div style="background:rgba(201,148,58,0.10);border:1px solid rgba(201,148,58,0.28);border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#5C3D2E"><strong>What to do next:</strong></p>
      <ol style="margin:10px 0 0;padding-left:18px;color:#5C3D2E;line-height:1.7">
        <li>Buy your ticket by bank deposit or physical purchase.</li>
        <li>Log in to the Awurudu 2026 website.</li>
        <li>Upload your receipt or deposit slip.</li>
        <li>Wait for admin approval.</li>
        <li>Receive your QR code by email and view it on your dashboard.</li>
      </ol>
    </div>

    <p style="color:#5C3D2E">Once approved, your QR code will be sent to your email and will also appear on your website dashboard. The QR code can be used only once at the entrance.</p>
    <p style="color:#9C7D5A;font-size:13px">For inquiries: Harith +94 768 570 754 | Minol +94 765 373 271 | Alex +94 706 544 700</p>
  </td></tr>
  <tr><td style="background:#4E1219;padding:16px;text-align:center">
    <p style="color:#F5E4B8;font-size:11px;margin:0">Developed by Harith - SCU Awurudu 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

async function findReminderTargets() {
  const [{ data: profiles }, { data: registrations }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, is_admin'),
    supabaseAdmin
      .from('registrations')
      .select('user_id, receipt_url, receipt_status'),
  ])

  const registrationByUser = new Map((registrations ?? []).map((registration) => [registration.user_id, registration]))

  return (profiles ?? []).filter((profile) => {
    if (profile.is_admin) return false

    const registration = registrationByUser.get(profile.id)
    if (!registration) return true

    if (!registration.receipt_url) return true
    if (registration.receipt_status === 'rejected') return true

    return false
  })
}

async function sendReminderEmails() {
  const targets = await findReminderTargets()

  let sent = 0
  for (const target of targets) {
    if (!target.email) continue

    await transporter.sendMail({
      from: `"Awurudu 2026" <${process.env.GMAIL_USER}>`,
      to: target.email,
      subject: 'Reminder: Upload your receipt and confirm your Awurudu 2026 ticket',
      html: getReminderHtml(target.full_name || 'Student'),
    })
    sent += 1
  }

  return { totalTargets: targets.length, sent }
}

export async function POST() {
  const supabase = makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await sendReminderEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Manual payment reminder email job failed:', error)
    return NextResponse.json({ error: 'Reminder email job failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
  }

  const nowInColombo = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }))
  const month = nowInColombo.getMonth() + 1
  const day = nowInColombo.getDate()

  if (!(month === 5 && day >= 7)) {
    return NextResponse.json({ success: true, skipped: true, reason: 'Reminder window has not opened yet.' })
  }

  try {
    const result = await sendReminderEmails()
    return NextResponse.json({ success: true, source: 'cron', ...result })
  } catch (error) {
    console.error('Scheduled payment reminder email job failed:', error)
    return NextResponse.json({ error: 'Reminder email job failed' }, { status: 500 })
  }
}
