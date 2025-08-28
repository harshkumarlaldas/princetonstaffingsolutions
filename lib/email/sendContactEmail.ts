/**
 * Email sending utilities using Resend
 */

interface ContactEmailData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  ip?: string;
  userAgent?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendContactEmail(data: ContactEmailData): Promise<EmailResult> {
  const destEmail = process.env.DEST_EMAIL || 'harshkumarlaldascvr@gmail.com';
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  console.log('=== EMAIL FUNCTION DEBUG ===');
  console.log('Dest Email:', destEmail);
  console.log('From Email:', fromEmail);
  console.log('API Key exists:', !!process.env.RESEND_API_KEY);

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    // Dynamically import Resend to avoid issues if not installed
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = `New contact form message from ${data.name} – ${data.subject || 'No subject'}`;
    
    const submissionTime = new Date().toISOString();
    const clientIP = data.ip || 'Unknown';
    const userAgent = data.userAgent || 'Unknown';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Form Submission</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
            .message { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .meta { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Contact Form Submission</h2>
              <p>A new message has been submitted through your website's contact form.</p>
            </div>
            
            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${data.name}</div>
            </div>
            
            <div class="field">
              <div class="label">Email:</div>
              <div class="value">${data.email}</div>
            </div>
            
            ${data.phone ? `
            <div class="field">
              <div class="label">Phone:</div>
              <div class="value">${data.phone}</div>
            </div>
            ` : ''}
            
            ${data.company ? `
            <div class="field">
              <div class="label">Company:</div>
              <div class="value">${data.company}</div>
            </div>
            ` : ''}
            
            ${data.subject ? `
            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${data.subject}</div>
            </div>
            ` : ''}
            
            <div class="field">
              <div class="label">Message:</div>
              <div class="message">${data.message.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="meta">
              <p><strong>Submission Details:</strong></p>
              <p>Time: ${submissionTime} (UTC)</p>
              <p>Client IP: ${clientIP}</p>
              <p>User Agent: ${userAgent}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
New Contact Form Submission

A new message has been submitted through your website's contact form.

Name: ${data.name}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ''}
${data.company ? `Company: ${data.company}` : ''}
${data.subject ? `Subject: ${data.subject}` : ''}

Message:
${data.message}

---
Submission Details:
Time: ${submissionTime} (UTC)
Client IP: ${clientIP}
User Agent: ${userAgent}
    `;

    console.log('=== RESEND API CALL ===');
    console.log('From:', fromEmail);
    console.log('To:', destEmail);
    console.log('Subject:', subject);
    console.log('Reply-To:', data.email);

    const result = await resend.emails.send({
      from: fromEmail,
      to: [destEmail],
      reply_to: data.email,
      subject,
      html: htmlContent,
      text: textContent,
    });

    console.log('=== RESEND API RESULT ===');
    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.error) {
      console.error('Resend email error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    console.log('Contact email sent successfully:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.DEST_EMAIL);
}
