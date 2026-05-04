import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  }
})

export async function POST(req: Request) {
  const { studentEmail, studentName, qrToken } = await req.json()
  
  // Dynamically get the base URL from the request itself, so it works perfectly on Vercel without env vars
  const origin = new URL(req.url).origin
  const qrUrl = `${origin}/verify/${qrToken}`
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`

  try {
    await transporter.sendMail({
      from: `"Awurudu 2026" <${process.env.GMAIL_USER}>`,
      to: studentEmail,
      subject: 'You are invited - Suurya Mangalya at BMICH Hidden Escape',
      html: `<!DOCTYPE html>
<html><body style="margin:0;font-family:sans-serif;background:#FAF3E0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #EEE2C8">
  <tr><td style="background:linear-gradient(135deg,#4E1219,#7A1F28);padding:28px;text-align:center">
    <h1 style="color:#E8BC6A;font-size:24px;margin:0">Awurudu 2026</h1>
    <p style="color:#F5E4B8;font-size:13px;margin:6px 0 0">SCU - Aluth Avurudu Celebration</p>
  </td></tr>
  <tr><td style="padding:32px;background:#FAF3E0">
    <p style="color:#2B1A0E">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#5C3D2E">Your payment receipt has been approved. Your entry QR code is below.</p>
    <table width="100%"><tr><td align="center" style="padding:20px 0">
      <img src="${qrImgUrl}" width="220" height="220" alt="Entry QR"
        style="border:4px solid #C9943A;border-radius:12px;display:block"/>
      <p style="color:#9C7D5A;font-size:12px;margin:10px 0 0">Single use only - do not share</p>
    </td></tr></table>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold;width:120px">Date</td>
          <td style="color:#2B1A0E">8th May 2026</td></tr>
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold">Venue</td>
          <td style="color:#2B1A0E">BMICH Hidden Escape, Colombo</td></tr>
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold">Time</td>
          <td style="color:#2B1A0E">9:00 AM onwards</td></tr>
      <tr><td style="padding:8px 0;color:#5C3D2E;font-weight:bold">Ticket Price</td>
          <td style="color:#2B1A0E">LKR 850</td></tr>
    </table>

    <div style="background:#fff;border:1px solid rgba(201,148,58,0.3);border-radius:14px;padding:18px;margin-top:22px">
      <p style="margin:0 0 10px;color:#7A1F28;font-size:14px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase">Rules and Regulations</p>
      <ul style="margin:0;padding-left:18px;color:#5C3D2E;font-size:14px;line-height:1.65">
        <li>All attendees must enter through the Main Entrance and follow instructions from the organizing team.</li>
        <li>No entry without a valid ticket.</li>
        <li>All students must carry their SLIIT City Uni ID for identification.</li>
        <li>Maintain cleanliness and behave responsibly as the venue is public property. Any damages will be the individual&apos;s responsibility.</li>
        <li>The organizing committee has the right to take action or remove anyone for misconduct or breaking rules.</li>
        <li>Possession or use of illicit substances is strictly prohibited.</li>
      </ul>
    </div>
  </td></tr>
  <tr><td style="background:#4E1219;padding:16px;text-align:center">
    <p style="color:#F5E4B8;font-size:11px;margin:0">Developed by Harith - SCU Awurudu 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
