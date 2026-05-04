import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { studentEmail, studentName, qrToken } = await req.json()
    const qrUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${qrToken}`
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`

    const html = `<!DOCTYPE html>
<html><body style="margin:0;font-family:sans-serif;background:#FAF3E0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEE2C8">
  <tr><td style="background:linear-gradient(135deg,#4E1219,#7A1F28);padding:28px;text-align:center">
    <h1 style="color:#E8BC6A;font-size:24px;margin:0">Awurudu 2026</h1>
    <p style="color:#F5E4B8;font-size:13px;margin:6px 0 0">SLIIT City University — Aluth Avurudu Celebration</p>
  </td></tr>
  <tr><td style="padding:32px;background:#FAF3E0">
    <p style="color:#2B1A0E;font-size:15px">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#5C3D2E">Your payment receipt has been reviewed and approved. Your entry QR code is below. Please present it at the entrance on event day.</p>
    <table width="100%"><tr><td align="center" style="padding:24px 0">
      <img src="${qrImgUrl}" width="220" height="220" alt="Entry QR Code" style="border:4px solid #C9943A;border-radius:12px;display:block"/>
      <p style="color:#9C7D5A;font-size:12px;margin:10px 0 0">This QR code is for single use only. Do not share it.</p>
    </td></tr></table>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold;width:100px">Date</td><td style="padding:8px 0;color:#2B1A0E">8th May 2026</td></tr>
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold">Venue</td><td style="padding:8px 0;color:#2B1A0E">BMICH Kamatha, Colombo</td></tr>
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold">Time</td><td style="padding:8px 0;color:#2B1A0E">9:00 AM onwards</td></tr>
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold">After Party</td><td style="padding:8px 0;color:#2B1A0E">DJ After Party</td></tr>
    </table>
    <p style="color:#5C3D2E;margin-top:20px">For assistance, contact us on WhatsApp:<br>
      Harith: +94 768 570 754 &nbsp;|&nbsp; Minol: +94 765 373 271 &nbsp;|&nbsp; Alex: +94 706 544 700
    </p>
  </td></tr>
  <tr><td style="background:#4E1219;padding:16px;text-align:center">
    <p style="color:#F5E4B8;font-size:11px;margin:0">Developed and Published by Harith &nbsp;|&nbsp; SLIIT City University Awurudu 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

    await resend.emails.send({
      from: 'Awurudu 2026 <onboarding@resend.dev>',
      to: studentEmail,
      subject: 'You are invited — Awurudu 2026 at BMICH Kamatha',
      html,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send invite error:', error)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
