import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'The Others Market <noreply@theothersmarket.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai-market-place-theta.vercel.app'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', to)
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    // Non-fatal — log but don't throw so webhooks keep processing
    console.error('[email] Failed to send email to', to, err)
  }
}

// ── Templates ──────────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e4e4e7">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #27272a;border-radius:12px;overflow:hidden">
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #27272a">
            <span style="font-size:15px;font-weight:600;color:#a78bfa">The Others Market</span>
          </td>
        </tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #27272a;font-size:12px;color:#71717a">
            The Others Market · <a href="${APP_URL}/terms" style="color:#71717a">Terms</a> · <a href="${APP_URL}/privacy" style="color:#71717a">Privacy</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">${label}</a>`
}

export function verificationConfirmedEmail(displayName: string, tier: string) {
  const tierLabel = tier === 'free' ? 'Free (founding seller)' : tier === 'lifetime' ? 'Lifetime — $49 one-time' : 'Monthly subscription'
  return base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff">Your verified badge is active</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa">Hi ${displayName} — your seller profile on The Others Market is now verified.</p>
    <table cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin-bottom:8px;width:100%">
      <tr><td style="font-size:13px;color:#71717a">Verification tier</td></tr>
      <tr><td style="font-size:15px;color:#a78bfa;font-weight:500;padding-top:4px">${tierLabel}</td></tr>
    </table>
    <p style="font-size:14px;color:#a1a1aa">Your profile now shows a verified badge visible to all buyers. Keep your profile up to date to make the most of it.</p>
    ${btn('View your profile', `${APP_URL}/account/verification`)}
  `)
}

export function orderConfirmedBuyerEmail(displayName: string, orderId: string, listingTitle: string, amount: number) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff">Order confirmed</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa">Hi ${displayName} — your payment was received and your order is now active.</p>
    <table cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin-bottom:8px;width:100%">
      <tr><td style="font-size:13px;color:#71717a">Order</td></tr>
      <tr><td style="font-size:15px;color:#fff;font-weight:500;padding-top:4px">${listingTitle}</td></tr>
      <tr><td style="font-size:13px;color:#71717a;padding-top:12px">Amount paid</td></tr>
      <tr><td style="font-size:15px;color:#4ade80;font-weight:500;padding-top:4px">$${(amount / 100).toFixed(2)}</td></tr>
    </table>
    <p style="font-size:14px;color:#a1a1aa">The seller has been notified and will begin work shortly. You'll have 72 hours to review the delivery once it's submitted.</p>
    ${btn('View order', `${APP_URL}/orders/${orderId}`)}
  `)
}

export function newOrderSellerEmail(displayName: string, orderId: string, listingTitle: string, payout: number) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff">New order received</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa">Hi ${displayName} — someone just purchased your listing.</p>
    <table cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin-bottom:8px;width:100%">
      <tr><td style="font-size:13px;color:#71717a">Listing</td></tr>
      <tr><td style="font-size:15px;color:#fff;font-weight:500;padding-top:4px">${listingTitle}</td></tr>
      <tr><td style="font-size:13px;color:#71717a;padding-top:12px">Your payout (after fee)</td></tr>
      <tr><td style="font-size:15px;color:#4ade80;font-weight:500;padding-top:4px">$${(payout / 100).toFixed(2)}</td></tr>
    </table>
    <p style="font-size:14px;color:#a1a1aa">Deliver the work and mark the order as complete to release your payout.</p>
    ${btn('View order', `${APP_URL}/orders/${orderId}`)}
  `)
}
