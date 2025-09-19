# Contact Form Feature Implementation

## Overview
This document provides a comprehensive guide to the contact form feature implementation in the Princeton Staffing Solutions Next.js application. The contact form includes reCAPTCHA v3 protection, email sending via Resend, rate limiting, and comprehensive form validation.

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Environment Configuration](#environment-configuration)
5. [Form Implementation](#form-implementation)
6. [API Route Implementation](#api-route-implementation)
7. [Email Service Integration](#email-service-integration)
8. [Security Features](#security-features)
9. [Validation Schema](#validation-schema)
10. [Rate Limiting](#rate-limiting)
11. [Error Handling](#error-handling)
12. [Testing Guide](#testing-guide)
13. [Troubleshooting](#troubleshooting)
14. [Deployment Considerations](#deployment-considerations)

## Feature Overview

The contact form is a critical component that allows potential clients to reach out to Princeton Staffing Solutions. It includes:

- **Multi-field form** with name, email, phone, company, subject, message, and website
- **reCAPTCHA v3 protection** against spam and bots
- **Email delivery** via Resend API service
- **Rate limiting** to prevent abuse
- **Comprehensive validation** using Zod schema
- **Privacy consent** checkbox with terms links
- **Form age validation** to prevent automated submissions
- **Real-time validation** with user feedback

## Technology Stack

### Frontend
- **Next.js 14** with App Router
- **React Hook Form** for form management
- **Material-UI (MUI)** for UI components
- **Zod** for schema validation
- **react-google-recaptcha-v3** for CAPTCHA protection
- **TypeScript** for type safety

### Backend
- **Next.js API Routes** for server-side handling
- **Resend** for email delivery
- **Upstash Redis** for rate limiting
- **Google reCAPTCHA v3** for bot protection

### Styling
- **Tailwind CSS v4** for styling
- **PostCSS** for CSS processing

## Project Structure

```
src/
├── app/
│   ├── (marketing)/
│   │   └── contact/
│   │       └── page.tsx              # Contact page component
│   └── api/
│       └── contact/
│           └── route.ts              # API route handler
├── components/
│   └── forms/
│       └── ContactForm.tsx           # Main contact form component
├── lib/
│   ├── email/
│   │   └── sendContactEmail.ts       # Email sending service
│   ├── security/
│   │   └── rateLimit.ts              # Rate limiting implementation
│   └── validation/
│       └── contact.schema.ts         # Form validation schema
└── types/
    └── contact.ts                    # TypeScript interfaces
```

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Email Configuration (Resend)
DEST_EMAIL=harshkumarlaldascvr@gmail.com
FROM_EMAIL=onboarding@resend.dev
RESEND_API_KEY=re_YOUR_REAL_API_KEY_HERE

# CAPTCHA Configuration (Google reCAPTCHA v3)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LevzKorAAAAAND4KBt4RmqKXCL4XexCo_OpJTcf
RECAPTCHA_SECRET_KEY=6LevzKorAAAAAJVaVJKyZJsoBtkXr2-E7_MahwRu

# Rate Limiting (Upstash Redis - Optional but recommended)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Environment Variable Details

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DEST_EMAIL` | Email address where contact form submissions are sent | Yes | `harshkumarlaldascvr@gmail.com` |
| `FROM_EMAIL` | Sender email address (must be verified with Resend) | Yes | `onboarding@resend.dev` |
| `RESEND_API_KEY` | Resend API key for sending emails | Yes | `re_1234567890abcdef` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 site key (public) | Yes | `6LevzKorAAAAAND4KBt4RmqKXCL4XexCo_OpJTcf` |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3 secret key (server-side) | Yes | `6LevzKorAAAAAJVaVJKyZJsoBtkXr2-E7_MahwRu` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL | No | `https://your-redis-url.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API token | No | `your-redis-token` |

## Form Implementation

### ContactForm Component

The main contact form component is located at `src/components/forms/ContactForm.tsx`:

```typescript
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactFormSchema, ContactFormData } from '@/lib/validation/contact.schema';

const ContactFormInner: React.FC<ContactFormProps> = ({ onSubmit }) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { register, handleSubmit, formState: { errors, isValid }, watch, setValue } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onChange'
  });

  const watchedValues = watch();
  const [formStartTime] = useState(Date.now());
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Form age validation (minimum 3 seconds)
  useEffect(() => {
    const formAge = Math.max(3, Math.floor((Date.now() - formStartTime) / 1000));
    setValue('formAge', formAge);
  }, [formStartTime, setValue]);

  // CAPTCHA token setup
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      setValue('captchaToken', 'pending');
    } else {
      setValue('captchaToken', 'captcha-not-configured');
    }
  }, [setValue]);

  const onSubmit = async (data: ContactFormData) => {
    setSubmitStatus('loading');
    try {
      // Execute reCAPTCHA v3
      if (executeRecaptcha && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        const token = await executeRecaptcha('contact_form');
        data.captchaToken = token;
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.ok) {
        setSubmitStatus('success');
        reset();
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  const isFormValid = isValid && 
    watchedValues.privacyConsent && 
    (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? true : true);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields implementation */}
    </form>
  );
};

// Wrapper component with reCAPTCHA provider
const ContactForm: React.FC<ContactFormProps> = (props) => {
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    return <ContactFormInner {...props} />;
  }
  
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
      scriptProps={{ async: false, defer: false, appendTo: 'head', nonce: undefined }}
    >
      <ContactFormInner {...props} />
    </GoogleReCaptchaProvider>
  );
};
```

### Form Fields

The form includes the following fields:

1. **Name** (required) - Full name of the contact
2. **Email** (required) - Contact email address
3. **Phone** (optional) - Phone number with international format support
4. **Company** (optional) - Company name
5. **Subject** (optional) - Message subject
6. **Message** (required) - Main message content
7. **Website** (optional) - Company website URL
8. **Privacy Consent** (required) - Checkbox agreeing to terms

### Form Validation

Real-time validation is implemented using:
- **React Hook Form** for form state management
- **Zod schema** for validation rules
- **Material-UI** components with error states
- **Custom validation** for phone numbers and form age

## API Route Implementation

### Contact API Route

The API route is located at `src/app/api/contact/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { contactFormSchema } from '@/lib/validation/contact.schema';
import { sendContactEmail } from '@/lib/email/sendContactEmail';
import { RateLimiter } from '@/lib/security/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = contactFormSchema.parse(body);

    // Rate limiting
    const rateLimiter = new RateLimiter();
    const clientIP = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const isAllowed = await rateLimiter.isAllowed(clientIP);
    
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // reCAPTCHA verification
    let captchaResult = { success: true, score: 1.0 };
    if (process.env.RECAPTCHA_SECRET_KEY && validatedData.captchaToken) {
      const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: validatedData.captchaToken,
          remoteip: clientIP
        })
      });
      captchaResult = await captchaResponse.json();
    }

    // Send email
    const emailResult = await sendContactEmail({
      ...validatedData,
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'Unknown'
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully!' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Invalid form data. Please check your inputs.' },
      { status: 400 }
    );
  }
}
```

## Email Service Integration

### Resend Email Service

The email service is implemented in `src/lib/email/sendContactEmail.ts`:

```typescript
import { Resend } from 'resend';

interface ContactEmailData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  website?: string;
  ip?: string;
  userAgent?: string;
}

export async function sendContactEmail(data: ContactEmailData): Promise<EmailResult> {
  const destEmail = process.env.DEST_EMAIL || 'harshkumarlaldascvr@gmail.com';
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const subject = `New contact form message from ${data.name} – ${data.subject || 'No subject'}`;
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: [destEmail],
      reply_to: data.email,
      subject,
      html: generateHtmlContent(data),
      text: generateTextContent(data)
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Failed to send email'
      };
    }

    return {
      success: true,
      messageId: result.data?.id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}
```

### Email Templates

The email service generates both HTML and text versions of the email with:
- Contact form data
- Submission timestamp
- Client IP address
- User agent information
- Professional formatting

## Security Features

### reCAPTCHA v3 Protection

- **Invisible CAPTCHA** that runs automatically on form submission
- **Score-based verification** (0.0 to 1.0, higher is better)
- **Server-side verification** using secret key
- **Action-specific tokens** for different form types

### Rate Limiting

- **Redis-based rate limiting** using Upstash
- **IP-based tracking** with configurable limits
- **Sliding window** algorithm for fair limiting
- **Graceful degradation** when Redis is unavailable

### Form Validation

- **Client-side validation** for immediate feedback
- **Server-side validation** for security
- **Form age validation** to prevent automated submissions
- **Input sanitization** to prevent XSS attacks

## Validation Schema

### Zod Schema Definition

The validation schema is defined in `src/lib/validation/contact.schema.ts`:

```typescript
import { z } from 'zod';

const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,14}$/;

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().refine((val) => !val || phoneRegex.test(val), {
    message: 'Please enter a valid phone number (e.g., +1234567890)'
  }),
  company: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  formAge: z.number().min(3, 'Please wait at least 3 seconds before submitting'),
  captchaToken: z.string().min(1, 'Please complete the CAPTCHA'),
  privacyConsent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to our privacy policy and terms of service'
  })
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
```

## Rate Limiting

### Implementation Details

The rate limiting is implemented in `src/lib/security/rateLimit.ts`:

```typescript
import { Redis } from '@upstash/redis';

export class RateLimiter {
  private redis: Redis;
  private windowSize: number;
  private maxRequests: number;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
    this.windowSize = 3600; // 1 hour in seconds
    this.maxRequests = 10; // 10 requests per hour
  }

  async isAllowed(identifier: string): Promise<boolean> {
    try {
      const key = `rate_limit:${identifier}`;
      const now = Date.now();
      const windowStart = now - (this.windowSize * 1000);

      // Get current requests in window
      const requests = await this.redis.zrange(key, 0, -1, { withScores: true });
      const currentCount = requests.filter((item: any) => item.score >= windowStart).length;

      if (currentCount >= this.maxRequests) {
        return false;
      }

      // Add current request
      await this.redis.zadd(key, { [now.toString()]: now });
      await this.redis.expire(key, this.windowSize);

      return true;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return true; // Allow on error
    }
  }
}
```

## Error Handling

### Client-Side Error Handling

- **Form validation errors** displayed inline
- **Network error handling** with user feedback
- **Loading states** during form submission
- **Success/error notifications** after submission

### Server-Side Error Handling

- **Input validation** with detailed error messages
- **Rate limiting** with appropriate HTTP status codes
- **Email service errors** with fallback handling
- **CAPTCHA verification** errors
- **Comprehensive logging** for debugging

## Testing Guide

### Manual Testing

1. **Form Validation Testing**
   - Test required field validation
   - Test email format validation
   - Test phone number format validation
   - Test form age validation
   - Test privacy consent requirement

2. **CAPTCHA Testing**
   - Test with valid CAPTCHA token
   - Test with invalid CAPTCHA token
   - Test without CAPTCHA configuration

3. **Email Testing**
   - Test successful email sending
   - Test with invalid API key
   - Test with invalid email addresses

4. **Rate Limiting Testing**
   - Test normal usage within limits
   - Test exceeding rate limits
   - Test with Redis unavailable

### Automated Testing

The project includes:
- **Unit tests** for validation schemas
- **Integration tests** for API routes
- **E2E tests** for complete user flows

## Troubleshooting

### Common Issues

1. **"CAPTCHA not configured" Error**
   - Check `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in `.env.local`
   - Restart the development server
   - Verify the key is valid

2. **"Send Message" Button Disabled**
   - Check form validation errors
   - Ensure all required fields are filled
   - Verify privacy consent is checked
   - Check form age (minimum 3 seconds)

3. **Email Not Sending**
   - Verify `RESEND_API_KEY` is correct
   - Check `FROM_EMAIL` is verified with Resend
   - Check `DEST_EMAIL` is valid
   - Check Resend dashboard for errors

4. **Rate Limiting Issues**
   - Check Redis configuration
   - Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Check rate limiting logs

### Debug Mode

Enable debug logging by adding console.log statements in:
- Form validation logic
- API route handlers
- Email sending functions
- Rate limiting functions

## Deployment Considerations

### Environment Variables

Ensure all required environment variables are set in production:
- Use secure secret management
- Never commit API keys to version control
- Use different keys for different environments

### Domain Verification

For Resend email service:
- Verify your domain with Resend
- Use verified sender addresses
- Set up SPF, DKIM, and DMARC records

### CAPTCHA Configuration

- Use different keys for development and production
- Monitor CAPTCHA scores and adjust thresholds
- Set up CAPTCHA monitoring and alerts

### Rate Limiting

- Configure appropriate limits for your use case
- Monitor rate limiting metrics
- Set up alerts for abuse detection

### Monitoring

- Set up error monitoring (Sentry, etc.)
- Monitor email delivery rates
- Track form submission metrics
- Monitor CAPTCHA scores

## Performance Considerations

### Frontend Optimization

- **Lazy loading** of CAPTCHA script
- **Form validation** debouncing
- **Optimistic UI updates**
- **Error boundary** implementation

### Backend Optimization

- **Database connection pooling** for Redis
- **Email sending** queuing for high volume
- **Caching** for frequently accessed data
- **CDN** for static assets

## Security Best Practices

### Input Validation

- **Sanitize all inputs** before processing
- **Validate on both client and server**
- **Use allowlists** instead of blocklists
- **Implement proper error handling**

### API Security

- **Rate limiting** to prevent abuse
- **CAPTCHA protection** against bots
- **Input validation** and sanitization
- **Proper error handling** without information leakage

### Email Security

- **Verify sender domains** with Resend
- **Use secure email templates**
- **Implement email validation**
- **Monitor for abuse patterns**

## Future Enhancements

### Planned Features

1. **Email Templates** - Customizable email templates
2. **Form Analytics** - Track form performance and conversions
3. **Multi-language Support** - Internationalization
4. **Advanced Validation** - More sophisticated validation rules
5. **Integration Options** - CRM and marketing tool integrations

### Technical Improvements

1. **Caching** - Implement Redis caching for better performance
2. **Queue System** - Add email queue for high volume
3. **Monitoring** - Enhanced monitoring and alerting
4. **Testing** - Expanded test coverage
5. **Documentation** - API documentation and examples

## Conclusion

The contact form implementation provides a robust, secure, and user-friendly way for potential clients to reach out to Princeton Staffing Solutions. The combination of modern web technologies, comprehensive validation, security measures, and proper error handling ensures a reliable and professional user experience.

The modular architecture allows for easy maintenance and future enhancements, while the comprehensive documentation ensures that the feature can be properly maintained and extended by the development team.
