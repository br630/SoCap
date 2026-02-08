import { Resend } from 'resend';

// Initialize Resend client
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[EmailService] RESEND_API_KEY not configured — emails will be logged only.');
    return null;
  }
  return new Resend(apiKey);
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a single email via Resend. Falls back to console logging when not configured.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const resend = getResendClient();

  if (!resend) {
    console.log(`[EmailService] (no API key) Would send to ${options.to}: ${options.subject}`);
    console.log(`  Body: ${options.text}`);
    return true; // Treat as successful in dev
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      console.error(`[EmailService] Resend error for ${options.to}:`, error);
      return false;
    }

    console.log(`[EmailService] Sent email to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${options.to}:`, error);
    return false;
  }
}

/**
 * Send cancellation emails to all attendees of an event.
 */
export async function sendEventCancellationEmails(
  eventTitle: string,
  eventDate: Date,
  organizerName: string,
  attendees: { name: string; email: string | null }[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  for (const attendee of attendees) {
    if (!attendee.email) {
      console.log(`[EmailService] Skipping ${attendee.name} — no email address`);
      failed++;
      continue;
    }

    const subject = `Event Cancelled: ${eventTitle}`;
    const text = [
      `Hi ${attendee.name},`,
      '',
      `We wanted to let you know that the event "${eventTitle}" scheduled for ${formattedDate} has been cancelled by ${organizerName}.`,
      '',
      'We apologize for any inconvenience. If you have any questions, please reach out to the organizer.',
      '',
      'Best regards,',
      'SoCap',
    ].join('\n');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">Event Cancelled</h2>
        <p style="color: #555; font-size: 15px;">Hi ${attendee.name},</p>
        <p style="color: #555; font-size: 15px;">
          We wanted to let you know that the event <strong>"${eventTitle}"</strong>
          scheduled for <strong>${formattedDate}</strong> has been cancelled by <strong>${organizerName}</strong>.
        </p>
        <div style="background: #fff3f3; border-left: 4px solid #e53e3e; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="color: #e53e3e; font-weight: 600; margin: 0;">This event has been cancelled.</p>
        </div>
        <p style="color: #555; font-size: 15px;">
          We apologize for any inconvenience. If you have any questions, please reach out to the organizer.
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 32px;">Best regards,<br/>SoCap</p>
      </div>
    `;

    const success = await sendEmail({ to: attendee.email, subject, text, html });
    if (success) sent++;
    else failed++;
  }

  console.log(`[EmailService] Cancellation emails — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}
