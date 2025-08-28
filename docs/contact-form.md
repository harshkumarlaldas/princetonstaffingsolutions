# Contact Form Implementation Guide

## Overview

This document describes the production-grade contact form implementation for Princeton Staffing Solutions, featuring comprehensive security measures, CAPTCHA protection, and reliable email delivery.

## Architecture

### Technology Stack
- **Frontend**: Next.js 14, React, TypeScript, Material-UI
- **Form Handling**: React Hook Form with Zod validation
- **CAPTCHA**: Google reCAPTCHA v3 (invisible, better UX)
- **Email Service**: Resend (recommended for serverless)
- **Rate Limiting**: Upstash Redis
- **Security**: Input sanitization, honeypot fields, form age validation

### File Structure
```
lib/
├── validation/contact.schema.ts    # Zod validation schemas
├── security/
│   ├── sanitize.ts                 # Input sanitization
│   ├── captcha.ts                  # CAPTCHA verification
│   └── rateLimit.ts                # Rate limiting
├── email/sendContactEmail.ts       # Email sending logic
app/
├── api/contact/route.ts            # API route handler
└── components/forms/ContactForm.tsx # Form component
```

## Security Features

### 1. CAPTCHA Protection
- **Google reCAPTCHA v3**: Invisible CAPTCHA with score-based verification
- **Score Threshold**: 0.5 (configurable)
- **Server-side Verification**: All tokens verified server-side

### 2. Rate Limiting
- **Limit**: 5 submissions per IP per minute
- **Storage**: Upstash Redis (serverless-friendly)
- **Headers**: Retry-After, X-RateLimit-Remaining

### 3. Anti-Spam Measures
- **Honeypot Field**: Hidden "website" field to catch bots
- **Form Age Validation**: Minimum 3 seconds between form load and submit
- **Input Sanitization**: XSS prevention, HTML stripping

### 4. Input Validation
- **Zod Schemas**: Shared frontend/backend validation
- **Server-side Validation**: Never trust client data
- **Type Safety**: Full TypeScript coverage

## Provider Comparison

### Email Services

| Provider | Free Tier | Vercel Integration | Spam Detection | Setup Complexity |
|----------|-----------|-------------------|----------------|------------------|
| **Resend** | 3,000 emails/month | Excellent | Good | Low |
| Postmark | 100 emails/month | Good | Excellent | Medium |
| AWS SES | 62,000 emails/month | Good | Good | High |

**Recommendation**: Resend for its excellent Vercel integration and generous free tier.

### CAPTCHA Services

| Provider | Type | UX | Cost | Privacy |
|----------|------|----|------|---------|
| **Google reCAPTCHA v3** | Invisible | Excellent | Free | Good |
| hCaptcha | Invisible/Checkbox | Good | Free | Excellent |

**Recommendation**: Google reCAPTCHA v3 for better UX and integration.

## Environment Configuration

### Required Environment Variables

```bash
# Email Configuration
DEST_EMAIL=contact@ipvote.io
FROM_EMAIL=no-reply@ipvote.io
RESEND_API_KEY=re_xxxxxxxxxxxx

# CAPTCHA Configuration
RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RECAPTCHA_SECRET_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Rate Limiting (Optional but recommended)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Public CAPTCHA key (for frontend)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Environment Validation

The application validates required environment variables at startup:

```typescript
// Check if email service is configured
if (!process.env.RESEND_API_KEY || !process.env.DEST_EMAIL) {
  console.error('Email service not configured');
}

// Check if CAPTCHA is configured
if (!process.env.RECAPTCHA_SITE_KEY || !process.env.RECAPTCHA_SECRET_KEY) {
  console.error('CAPTCHA not configured');
}
```

## Setup Instructions

### 1. Email Service Setup (Resend)

1. **Sign up** at [resend.com](https://resend.com)
2. **Create API key** in dashboard
3. **Verify domain** (ipvote.io):
   ```bash
   # Add these DNS records
   TXT @ "v=spf1 include:_spf.resend.com ~all"
   TXT resend._domainkey "k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
   ```
4. **Set environment variables**:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   DEST_EMAIL=contact@ipvote.io
   FROM_EMAIL=no-reply@ipvote.io
   ```

### 2. CAPTCHA Setup (Google reCAPTCHA)

1. **Register** at [google.com/recaptcha](https://google.com/recaptcha)
2. **Create site** with reCAPTCHA v3
3. **Add domains**: `ipvote.io`, `*.ipvote.io`
4. **Get keys** and set environment variables:
   ```bash
   RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RECAPTCHA_SECRET_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 3. Rate Limiting Setup (Upstash Redis)

1. **Create database** at [upstash.com](https://upstash.com)
2. **Get credentials** and set environment variables:
   ```bash
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   ```

### 4. Domain Configuration

#### DNS Records for Email
```bash
# SPF Record
TXT @ "v=spf1 include:_spf.resend.com ~all"

# DKIM Record (provided by Resend)
TXT resend._domainkey "k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."

# DMARC Record
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@ipvote.io"
```

## API Endpoints

### POST /api/contact

**Request Body:**
```typescript
{
  name: string;           // Required, 2-100 chars
  email: string;          // Required, valid email
  phone?: string;         // Optional, E.164 format
  company?: string;       // Optional, 0-100 chars
  subject?: string;       // Optional, 0-200 chars
  message: string;        // Required, 10-5000 chars
  website?: string;       // Honeypot field (should be empty)
  formAge: number;        // Seconds since form load (min 3)
  captchaToken: string;   // Required, reCAPTCHA token
  privacyConsent: boolean; // Required, must be true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Thank you for your message! We will get back to you soon.",
  "messageId": "re_xxxxxxxxxxxx"
}
```

**Error Responses:**
- `400`: Validation error, CAPTCHA failure, honeypot filled
- `429`: Rate limit exceeded
- `500`: Server error, email failure

## Testing

### Manual Testing

```bash
# Test successful submission
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Test message",
    "captchaToken": "valid-token",
    "privacyConsent": true,
    "formAge": 5
  }'

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/contact \
    -H "Content-Type: application/json" \
    -d '{"name":"test","email":"test@test.com","message":"test","captchaToken":"token","privacyConsent":true,"formAge":5}'
done
```

### Automated Testing

```bash
# Run tests
npm test

# Test specific components
npm test -- --testNamePattern="ContactForm"
npm test -- --testNamePattern="contact API"
```

## Monitoring & Observability

### Logging

The API route logs:
- Successful submissions with metadata
- Failed submissions with error details
- Rate limit violations
- CAPTCHA failures
- Processing times

### Metrics to Monitor

- **Success Rate**: Email delivery success
- **CAPTCHA Score Distribution**: Bot detection effectiveness
- **Rate Limit Hits**: Abuse patterns
- **Processing Time**: Performance monitoring
- **Error Rates**: Service health

### Error Handling

- **Graceful Degradation**: Form works without optional services
- **User-Friendly Messages**: No technical details exposed
- **Retry Logic**: Email service retries on transient failures
- **Fallback Options**: Alternative email providers if needed

## Security Best Practices

### 1. Input Validation
- **Never trust client data**
- **Server-side validation** for all inputs
- **Type checking** with TypeScript
- **Length limits** to prevent abuse

### 2. Rate Limiting
- **IP-based limiting** with Redis
- **Configurable thresholds** (5/min default)
- **Proper headers** for client feedback
- **Graceful degradation** if Redis unavailable

### 3. CAPTCHA
- **Server-side verification** only
- **Score-based decisions** (0.5 threshold)
- **Token expiration** handling
- **Fallback options** for failures

### 4. Email Security
- **Domain verification** required
- **SPF/DKIM/DMARC** records
- **Reply-To headers** for direct replies
- **No sensitive data** in logs

## Troubleshooting

### Common Issues

1. **CAPTCHA not working**
   - Check site key configuration
   - Verify domain in reCAPTCHA console
   - Check browser console for errors

2. **Emails not sending**
   - Verify Resend API key
   - Check domain verification status
   - Review Resend dashboard for errors

3. **Rate limiting issues**
   - Check Redis connection
   - Verify environment variables
   - Monitor Redis usage

4. **Form validation errors**
   - Check Zod schema configuration
   - Verify all required fields
   - Test with minimal valid data

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=contact-form:*
```

### Health Check

Test the API health:
```bash
curl http://localhost:3000/api/health
```

## Performance Optimization

### 1. Caching
- **CAPTCHA tokens** cached briefly
- **Rate limit data** in Redis
- **Email templates** pre-rendered

### 2. Async Processing
- **Email sending** non-blocking
- **Rate limit updates** asynchronous
- **Error logging** background

### 3. Bundle Optimization
- **Dynamic imports** for heavy libraries
- **Tree shaking** for unused code
- **Code splitting** by route

## Maintenance

### Regular Tasks

1. **Monitor logs** for errors and abuse
2. **Check email delivery** rates
3. **Review CAPTCHA scores** for bot patterns
4. **Update dependencies** regularly
5. **Rotate API keys** periodically

### Key Rotation

```bash
# Generate new Resend API key
# Update RESEND_API_KEY in environment

# Generate new reCAPTCHA keys
# Update both site and secret keys

# Test thoroughly after rotation
```

## Support

For issues or questions:
1. Check this documentation
2. Review application logs
3. Test with minimal configuration
4. Contact development team

## Changelog

### v1.0.0 (Current)
- Initial implementation
- Google reCAPTCHA v3 integration
- Resend email service
- Upstash Redis rate limiting
- Comprehensive security measures

