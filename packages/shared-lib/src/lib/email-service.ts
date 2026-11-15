import nodemailer from 'nodemailer';

interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Returns a configured nodemailer transport instance, or null if credentials are not configured.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.MAIL_PASS || process.env.EMAIL_APP_PASSWORD || '';
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), // Strip spaces from Gmail 16-char app password
    },
  });
}

/**
 * Sends a generic transactional email. Safe fallback if SMTP credentials are missing.
 */
export async function sendEmail({ to, subject, html, text, from }: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getTransporter();
    const defaultUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'support@voloapp.in';
    const defaultFrom = process.env.SMTP_FROM || process.env.MAIL_FROM || `"VOLO Home Services" <${defaultUser}>`;

    if (!transporter) {
      console.warn(`[Email Service] SMTP credentials not set (SMTP_USER / SMTP_PASS). Simulating email to: ${Array.isArray(to) ? to.join(', ') : to} | Subject: "${subject}"`);
      return { success: false, error: 'SMTP credentials not configured in environment variables (SMTP_USER, SMTP_PASS).' };
    }

    const info = await transporter.sendMail({
      from: from || defaultFrom,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
    });

    console.log(`[Email Service] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[Email Service] Failed to send email to ${to}:`, error?.message || error);
    return { success: false, error: error?.message || 'Failed to send email' };
  }
}

/**
 * Standard branded VOLO email template layout wrapper.
 */
function wrapHtmlEmail({ title, preheader, bodyHtml, ctaText, ctaUrl }: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; }
    .container { max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(60, 1, 167, 0.06); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #3C01A7 0%, #5B13D4 100%); padding: 32px 36px; text-align: left; }
    .logo-text { color: #FFFFFF; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .logo-sub { color: #DDD6FE; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .content { padding: 36px 36px 24px 36px; font-size: 14px; line-height: 1.6; }
    .headline { font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0; letter-spacing: -0.3px; }
    .info-card { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EEF2F6; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748B; font-weight: 600; }
    .info-value { color: #0F172A; font-weight: 700; }
    .btn { display: inline-block; background-color: #3C01A7; color: #FFFFFF !important; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin-top: 24px; }
    .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 36px; text-align: center; font-size: 11px; color: #94A3B8; }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <div class="container">
    <div class="header">
      <div class="logo-text">⚡ VOLO</div>
      <div class="logo-sub">Home Services • Partner Operations</div>
    </div>
    <div class="content">
      <h1 class="headline">${title}</h1>
      ${bodyHtml}
      ${ctaText && ctaUrl ? `
        <div style="text-align: center; margin-top: 28px;">
          <a href="${ctaUrl}" class="btn">${ctaText}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #64748B;">VOLO Technologies Pvt. Ltd.</p>
      <p style="margin: 0 0 6px 0;">This is an automated operational notification. Please do not reply directly to this email.</p>
      <p style="margin: 0;">© ${currentYear} VOLO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 1. Alert sent to Admin when a new Captain submits their KYC application.
 */
export async function sendKycSubmissionAdminEmail({
  workerId,
  workerName,
  workerPhone,
  workerEmail,
  trade,
  adminBaseUrl,
}: {
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerEmail?: string | null;
  trade?: string;
  adminBaseUrl?: string;
}) {
  const adminRecipient = process.env.ADMIN_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER;
  if (!adminRecipient) {
    console.warn('[Email Service] No ADMIN_EMAIL or SMTP_USER configured to receive admin alerts.');
    return { success: false, error: 'No admin recipient configured.' };
  }

  const reviewUrl = `${adminBaseUrl || 'https://admin.voloapp.in'}/admin/captains/view?id=${workerId}`;

  const bodyHtml = `
    <p>A new technician/captain has completed their KYC registration and submitted documents (Aadhaar, PAN, Live Selfie, and Experience Certificates) for approval.</p>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Captain Name:</span>
        <span class="info-value">${workerName || 'New Partner'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone Number:</span>
        <span class="info-value">${workerPhone || 'N/A'}</span>
      </div>
      ${workerEmail ? `
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${workerEmail}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Service Trade:</span>
        <span class="info-value" style="color:#3C01A7;">${trade || 'General Services'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Submitted At:</span>
        <span class="info-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      </div>
    </div>

    <p style="color: #64748B; font-size: 13px;">Please review the uploaded identity and trade experience documents in the Admin Panel to verify and approve or request resubmission.</p>
  `;

  return sendEmail({
    to: adminRecipient,
    subject: `🚨 [KYC Alert] New Captain Verification Submission: ${workerName} (${trade || 'Partner'})`,
    html: wrapHtmlEmail({
      title: 'New Captain KYC Submission',
      preheader: `Captain ${workerName} (${workerPhone}) has submitted documents for verification.`,
      bodyHtml,
      ctaText: 'Review Captain Profile',
      ctaUrl: reviewUrl,
    }),
  });
}

/**
 * 2. Confirmation sent to the Worker when they submit their KYC documents.
 */
export async function sendKycSubmissionWorkerAck({
  workerEmail,
  workerName,
}: {
  workerEmail?: string | null;
  workerName: string;
}) {
  if (!workerEmail) return { success: false, error: 'No worker email' };

  const bodyHtml = `
    <p>Hi <strong>${workerName}</strong>,</p>
    <p>Thank you for submitting your KYC documents and details to become a verified <strong>VOLO Captain</strong>!</p>
    <p>Our verification team is currently reviewing your documents (Aadhaar, PAN, live portrait, and experience certificates). Verification is typically completed within <strong>24 business hours</strong>.</p>
    <div class="info-card">
      <p style="margin: 0; color: #3C01A7; font-weight: 700; font-size: 13px;">✨ What happens next?</p>
      <p style="margin: 6px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.5;">Once approved, you will receive an instant mobile push notification and email confirmation. You will then be able to go <strong>ONLINE</strong> in the VOLO Partner app and start receiving nearby customer service bookings immediately.</p>
    </div>
    <p>If any document requires clarification, we will notify you with specific instructions on how to resubmit.</p>
  `;

  return sendEmail({
    to: workerEmail,
    subject: `VOLO Partner: Your KYC Application Has Been Received`,
    html: wrapHtmlEmail({
      title: 'KYC Application Received',
      preheader: 'Your documents are being verified by our onboarding team.',
      bodyHtml,
    }),
  });
}

/**
 * 3. Celebratory approval email sent to the Captain when KYC is approved.
 */
export async function sendKycApprovedEmail({
  workerEmail,
  workerName,
  workerId,
}: {
  workerEmail?: string | null;
  workerName: string;
  workerId?: string;
}) {
  if (!workerEmail) return { success: false, error: 'No worker email' };

  const bodyHtml = `
    <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; color: #065F46; font-weight: 800; font-size: 15px;">🎉 Verification Complete & Approved!</p>
      <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px;">Your identity, certificate, and bank account details have been successfully verified by VOLO.</p>
    </div>

    <p>Hi <strong>${workerName}</strong>,</p>
    <p>We are thrilled to welcome you as an official <strong>VOLO Captain</strong>! Your partner account is now fully active with zero restrictions.</p>

    <div class="info-card">
      <p style="margin: 0 0 8px 0; font-weight: 800; color: #0F172A;">How to start earning right now:</p>
      <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.8;">
        <li>Open the <strong>VOLO Partner App</strong> on your phone.</li>
        <li>Switch your status toggle at the top from <strong>Offline → Online</strong>.</li>
        <li>Keep GPS location enabled to automatically receive customer dispatches near your area.</li>
        <li>Earn directly into your VOLO Wallet with fast bank settlements!</li>
      </ol>
    </div>

    <p style="color: #64748B; font-size: 13px;">Welcome to the team. Let's provide extraordinary service together!</p>
  `;

  return sendEmail({
    to: workerEmail,
    subject: `🎉 Congratulations! Your VOLO Captain Account is Approved`,
    html: wrapHtmlEmail({
      title: 'Welcome to VOLO — You Are Now Approved!',
      preheader: 'Your KYC has been approved. Switch your status to Online to start accepting customer orders.',
      bodyHtml,
      ctaText: 'Open VOLO Partner App',
      ctaUrl: 'https://voloapp.in/download',
    }),
  });
}

/**
 * 4. Update / Rejection email sent to Worker when KYC needs corrections.
 */
export async function sendKycRejectedEmail({
  workerEmail,
  workerName,
  remarks,
}: {
  workerEmail?: string | null;
  workerName: string;
  remarks?: string | null;
}) {
  if (!workerEmail) return { success: false, error: 'No worker email' };

  const bodyHtml = `
    <p>Hi <strong>${workerName}</strong>,</p>
    <p>Our verification team reviewed your KYC application, but we were unable to complete verification with the provided documents.</p>

    <div class="info-card" style="border-left: 4px solid #E11D48;">
      <p style="margin: 0; color: #9F1239; font-weight: 800; font-size: 13px;">Reason for Document Update:</p>
      <p style="margin: 6px 0 0 0; color: #BE123C; font-weight: 600; font-size: 13px;">
        ${remarks || 'One or more documents were blurry, mismatched, or could not be verified. Please review and re-upload.'}
      </p>
    </div>

    <p><strong>How to fix this:</strong></p>
    <ol style="color: #475569; font-size: 13px; line-height: 1.7; padding-left: 20px;">
      <li>Open the <strong>VOLO Partner App</strong> and navigate to <strong>Profile → KYC & Verification</strong>.</li>
      <li>Check the flagged documents and upload a clear, legible photo.</li>
      <li>Tap <strong>Submit KYC for Verification</strong>.</li>
    </ol>
    <p>We will re-evaluate your profile as soon as the updated documents are received.</p>
  `;

  return sendEmail({
    to: workerEmail,
    subject: `Action Required: VOLO Captain KYC Verification Update`,
    html: wrapHtmlEmail({
      title: 'KYC Document Update Needed',
      preheader: 'Please re-upload your document so our team can approve your partner profile.',
      bodyHtml,
      ctaText: 'Re-upload in VOLO Partner App',
      ctaUrl: 'https://voloapp.in',
    }),
  });
}

/**
 * 5. General broadcast / alert / subscription notification email.
 */
export async function sendBroadcastNotificationEmail({
  to,
  subject,
  title,
  body,
  actionText,
  actionUrl,
}: {
  to: string | string[];
  subject: string;
  title: string;
  body: string;
  actionText?: string;
  actionUrl?: string;
}) {
  const bodyHtml = `
    <div style="font-size: 14px; line-height: 1.7; color: #334155;">
      ${body.split('\n').map(p => `<p>${p}</p>`).join('')}
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html: wrapHtmlEmail({
      title,
      bodyHtml,
      ctaText: actionText,
      ctaUrl: actionUrl,
    }),
  });
}
