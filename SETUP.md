# Quick Setup Guide

## Immediate Setup (No CAPTCHA/Email Required)

To get the contact form running immediately for testing:

1. **Create a `.env.local` file** in the root directory:
   ```bash
   # Copy the example file
   cp env.example .env.local
   ```

2. **Edit `.env.local`** and add at least these minimal settings:
   ```bash
   # Required for basic functionality
   DEST_EMAIL=your-email@example.com
   FROM_EMAIL=no-reply@example.com
   
   # Optional - will show placeholder if not set
   # RESEND_API_KEY=re_xxxxxxxxxxxx
   # RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   # RECAPTCHA_SECRET_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   # NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Test the form** at `http://localhost:3000/contact`

## What Works Without Configuration

- ✅ Form validation and UI
- ✅ Form submission (will show success message)
- ✅ Input sanitization
- ✅ Rate limiting (if Redis configured)
- ⚠️ CAPTCHA (shows placeholder message)
- ⚠️ Email sending (will fail gracefully)

## Full Setup (Production Ready)

For production use, you'll need to configure:

1. **Email Service (Resend)**:
   - Sign up at [resend.com](https://resend.com)
   - Get API key and add to `RESEND_API_KEY`
   - Verify your domain

2. **CAPTCHA (Google reCAPTCHA)**:
   - Register at [google.com/recaptcha](https://google.com/recaptcha)
   - Create reCAPTCHA v3 site
   - Add site key and secret key to environment variables

3. **Rate Limiting (Optional)**:
   - Create Upstash Redis database
   - Add Redis URL and token to environment variables

See `docs/contact-form.md` for complete setup instructions.

## Testing

- **Form UI**: Visit `/contact` page
- **API Health**: `curl http://localhost:3000/api/health`
- **Manual API Test**: Run `./scripts/test-contact-api.sh`

## Troubleshooting

- **CAPTCHA Error**: Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` or leave empty for placeholder
- **Email Error**: Set `RESEND_API_KEY` or the form will show success but not send email
- **Build Errors**: Make sure all dependencies are installed with `npm install`

