import { NextRequest, NextResponse } from 'next/server';
import { contactFormSchema, serverContactSchema } from '@/lib/validation/contact.schema';
import { sanitizeContactFormData } from '@/lib/security/sanitize';
import { verifyCaptcha } from '@/lib/security/captcha';
import { checkContactFormRateLimit } from '@/lib/security/rateLimit';
import { sendContactEmail } from '@/lib/email/sendContactEmail';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIP = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Add server-side data
    const serverData = {
      ...body,
      ip: clientIP,
      userAgent,
      timestamp: Date.now(),
    };

    // Validate with server schema
    const validationResult = serverContactSchema.safeParse(serverData);
    if (!validationResult.success) {
      console.warn('Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check rate limiting
    const rateLimitResult = await checkContactFormRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
          }
        }
      );
    }

    // Check honeypot field (bots often fill hidden fields)
    if (data.website && data.website.trim() !== '') {
      console.warn(`Honeypot field filled by IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Check form age (prevent instant submissions)
    if (data.formAge < 3) {
      console.warn(`Form submitted too quickly by IP: ${clientIP}, age: ${data.formAge}s`);
      return NextResponse.json(
        { error: 'Please wait a moment before submitting' },
        { status: 400 }
      );
    }

    // Verify CAPTCHA (skip if not configured)
    let captchaResult: { success: boolean; score?: number; error?: string } = { success: true, score: 1.0 };
    if (process.env.RECAPTCHA_SECRET_KEY && data.captchaToken !== 'captcha-not-configured') {
      captchaResult = await verifyCaptcha(data.captchaToken);
      if (!captchaResult.success) {
        console.warn(`CAPTCHA verification failed for IP: ${clientIP}:`, captchaResult.error);
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 400 }
        );
      }
    } else if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.warn('CAPTCHA not configured - skipping verification');
    }

    // Sanitize input data
    const sanitizedData = sanitizeContactFormData({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      subject: data.subject,
      message: data.message,
    });

    // Send email
    console.log('=== SENDING EMAIL VIA RESEND API ===');
    console.log('Resend API Key configured:', !!process.env.RESEND_API_KEY);
    console.log('Resend API Key (first 10 chars):', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
    console.log('Environment DEST_EMAIL:', process.env.DEST_EMAIL);
    console.log('Environment FROM_EMAIL:', process.env.FROM_EMAIL);
    console.log('Final Destination Email:', process.env.DEST_EMAIL || 'harshkumarlaldascvr@gmail.com');
    console.log('Final From Email:', process.env.FROM_EMAIL || 'onboarding@resend.dev');
    console.log('Form Data:', sanitizedData);
    
    const emailResult = await sendContactEmail({
      ...sanitizedData,
      ip: clientIP,
      userAgent,
    });

    console.log('=== RESEND API RESPONSE ===');
    console.log('Email Result:', JSON.stringify(emailResult, null, 2));
    console.log('=== END RESEND API ===');

    // Log successful submission
    const processingTime = Date.now() - startTime;
    console.log(`Contact form submission successful:`, {
      ip: clientIP,
      email: sanitizedData.email,
      name: sanitizedData.name,
      processingTime: `${processingTime}ms`,
      captchaScore: captchaResult.score,
      messageId: emailResult.messageId,
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        messageId: emailResult.messageId,
      },
      { status: 200 }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Contact form error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
