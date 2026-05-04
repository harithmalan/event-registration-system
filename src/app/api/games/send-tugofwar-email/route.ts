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
  try {
    const { studentEmail, studentName, groupName, memberCount, role } = await req.json()
    const displayRole = role === 'creator' ? 'Group Creator' : 'Team Member'

    await transporter.sendMail({
      from: `"Awurudu 2026" <${process.env.GMAIL_USER}>`,
      to: studentEmail,
      subject: 'Welcome to Tug of War - Awurudu 2026',
      html: `<!DOCTYPE html>
<html><body style="margin:0;font-family:sans-serif;background:#FAF3E0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0">
<table width="560" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #EEE2C8">
  <tr><td style="background:linear-gradient(135deg,#1F3A1A,#2D5A27);padding:28px;text-align:center">
    <h1 style="color:#E8BC6A;font-size:24px;margin:0">Awurudu 2026</h1>
    <p style="color:#F5E4B8;font-size:13px;margin:6px 0 0">Tug of War Registration Confirmed</p>
  </td></tr>
  <tr><td style="padding:32px;background:#FAF3E0">
    <p style="color:#2B1A0E">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#5C3D2E">You have successfully joined the <strong>Tug of War</strong> competition for Awurudu 2026.</p>
    <div style="background:rgba(45,90,39,0.08);border:1px solid rgba(45,90,39,0.2);border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#5C3D2E"><strong>Group:</strong> ${groupName}</p>
      <p style="margin:8px 0 0;color:#5C3D2E"><strong>Your Role:</strong> ${displayRole}</p>
      <p style="margin:8px 0 0;color:#5C3D2E"><strong>Current Team Size:</strong> ${memberCount} members</p>
      <p style="margin:8px 0 0;color:#5C3D2E"><strong>Date:</strong> 8th May 2026</p>
      <p style="margin:8px 0 0;color:#5C3D2E"><strong>Venue:</strong> BMICH Hidden Escape, Colombo</p>
    </div>
    <p style="color:#5C3D2E">Coordinate with your teammates, arrive early, and get ready for the challenge.</p>
    <p style="color:#9C7D5A;font-size:13px">For assistance: Harith +94 768 570 754 | Minol +94 765 373 271 | Alex +94 706 544 700</p>
  </td></tr>
  <tr><td style="background:#1F3A1A;padding:16px;text-align:center">
    <p style="color:#F5E4B8;font-size:11px;margin:0">SLIIT City University - Awurudu 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send tug of war email error:', error)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
