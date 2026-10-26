import { config } from '../config/index.js';

/**
 * Send transactional email via Brevo (Sendinblue) API.
 * @see https://developers.brevo.com/docs/send-a-transactional-email
 */
export async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  if (!config.brevoApiKey) {
    console.warn('[Brevo] BREVO_API_KEY not set — email not sent:', subject, '→', toEmail);
    return { skipped: true };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: config.brevoSenderName,
        email: config.brevoSenderEmail
      },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      htmlContent,
      textContent: textContent || htmlContent?.replace(/<[^>]+>/g, ' ')
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
  return { ok: true };
}

export async function sendWelcomeCredentialsEmail(user, plainPassword) {
  const html = `
    <p>Hello ${user.full_name},</p>
    <p>Your TMLogistx account has been created.</p>
    <p><strong>Email:</strong> ${user.email}<br/>
    <strong>Temporary password:</strong> ${plainPassword}</p>
    <p>Sign in and change your password from Account → Change password.</p>
    <p><a href="${config.webAppUrl}/">Open TMLogistx Portal</a></p>
  `;
  return sendBrevoEmail({
    toEmail: user.email,
    toName: user.full_name,
    subject: 'Your TMLogistx account credentials',
    htmlContent: html
  });
}

export async function sendPasswordResetEmail(user, resetUrl) {
  const html = `
    <p>Hello ${user.full_name},</p>
    <p>We received a request to reset your TMLogistx password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
  `;
  return sendBrevoEmail({
    toEmail: user.email,
    toName: user.full_name,
    subject: 'Reset your TMLogistx password',
    htmlContent: html,
    textContent: `Reset your password: ${resetUrl}`
  });
}
