import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { studentEmail, studentName, reason } = await req.json()

    const html = `<!DOCTYPE html>
<html><body style="margin:0;font-family:sans-serif;background:#FAF3E0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0">
<table width="560" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #EEE2C8">
  <tr><td style="background:#4E1219;padding:24px;text-align:center">
    <h1 style="color:#E8BC6A;font-size:22px;margin:0">Awurudu 2026</h1>
    <p style="color:#F5E4B8;font-size:12px;margin:4px 0 0">SLIIT City University</p>
  </td></tr>
  <tr><td style="padding:32px;background:#FAF3E0">
    <p style="color:#2B1A0E">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#5C3D2E">Unfortunately your payment receipt could not be approved at this time.</p>
    ${reason ? `<div style="background:rgba(139,26,26,0.07);border:1px solid rgba(139,26,26,0.2);border-radius:10px;padding:12px 16px;margin:12px 0"><p style="margin:0;color:#8B1A1A;font-size:14px"><strong>Reason:</strong> ${reason}</p></div>` : ''}
    <p style="color:#5C3D2E">Please re-upload a clear image of your payment receipt through the registration portal, or contact one of our organisers on WhatsApp for assistance:</p>
    <p style="color:#5C3D2E">Harith: +94 768 570 754 &nbsp;|&nbsp; Minol: +94 765 373 271 &nbsp;|&nbsp; Alex: +94 706 544 700</p>
  </td></tr>
  <tr><td style="background:#4E1219;padding:14px;text-align:center">
    <p style="color:#F5E4B8;font-size:11px;margin:0">SLIIT City University Awurudu 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

    await resend.emails.send({
      from: 'Awurudu 2026 <onboarding@resend.dev>',
      to: studentEmail,
      subject: 'Receipt update — Awurudu 2026 registration',
      html,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send reject error:', error)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
