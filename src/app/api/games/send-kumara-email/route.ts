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
    const { studentEmail, studentName, gender, batch } = await req.json()
    const title = gender === 'kumara' ? 'Awurudu Kumara' : 'Awurudu Kumariya'

    await transporter.sendMail({
      from: `"Awurudu 2026" <${process.env.GMAIL_USER}>`,
      to: studentEmail,
      subject: `Welcome to ${title} Competition - Awurudu 2026`,
      html: `<!DOCTYPE html>
<html><body style="margin:0;font-family:sans-serif;background:#FAF3E0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0">
<table width="560" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #EEE2C8">
  <tr><td style="background:linear-gradient(135deg,#4E1219,#7A1F28);padding:28px;text-align:center">
    <h1 style="color:#E8BC6A;font-size:24px;margin:0">Awurudu 2026</h1>
    <p style="color:#F5E4B8;font-size:13px;margin:6px 0 0">Games Registration Confirmed</p>
  </td></tr>
  <tr><td style="padding:32px;background:#FAF3E0">
    <p style="color:#2B1A0E">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#5C3D2E">You have successfully registered for the <strong>${title}</strong> competition at Awurudu 2026.</p>
    <div style="background:rgba(201,148,58,0.1);border:1px solid rgba(201,148,58,0.3);border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#5C3D2E"><strong>Competition:</strong> ${title}</p>
      <p style="margin:8px 0 0;color:#5C3D2E"><strong>Batch:</strong> ${batch}</p>
      <p style="margin:8px 0 0;color:#5C3D2E"><strong>Date:</strong> 8th May 2026</p>
      <p style="margin:8px 0 0;color:#5C3D2E"><strong>Venue:</strong> BMICH Hidden Escape, Colombo</p>
    </div>
    <p style="color:#5C3D2E">Please arrive early on the day and check in at the registration desk. Best of luck.</p>
    <p style="color:#9C7D5A;font-size:13px">For assistance: Harith +94 768 570 754 | Minol +94 765 373 271 | Alex +94 706 544 700</p>
  </td></tr>
  <tr><td style="background:#4E1219;padding:16px;text-align:center">
    <p style="color:#F5E4B8;font-size:11px;margin:0">SLIIT City University - Awurudu 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send kumara email error:', error)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
