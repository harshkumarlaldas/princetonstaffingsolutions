# Princeton Staffing Solutions - Documentation

## Contact Form Implementation

This project includes a production-grade contact form with comprehensive security measures, CAPTCHA protection, and reliable email delivery.

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Set up Services**
   - [Resend](https://resend.com) for email delivery
   - [Google reCAPTCHA](https://google.com/recaptcha) for bot protection
   - [Upstash Redis](https://upstash.com) for rate limiting (optional)

4. **Run the Application**
   ```bash
   npm run dev
   ```

### Features

- ✅ **Secure Form Validation** with Zod schemas
- ✅ **Google reCAPTCHA v3** integration
- ✅ **Rate Limiting** with Upstash Redis
- ✅ **Email Delivery** via Resend
- ✅ **Anti-Spam Measures** (honeypot, form age validation)
- ✅ **Input Sanitization** and XSS prevention
- ✅ **Accessibility** compliant
- ✅ **TypeScript** support
- ✅ **Comprehensive Testing**

### Documentation

- [Contact Form Implementation Guide](./contact-form.md) - Complete setup and configuration
- [API Documentation](./contact-form.md#api-endpoints) - API reference
- [Security Features](./contact-form.md#security-features) - Security measures
- [Troubleshooting](./contact-form.md#troubleshooting) - Common issues and solutions

### Testing

```bash
# Run all tests
npm test

# Test contact form specifically
npm test -- --testNamePattern="Contact Form"
```

### Health Check

Monitor the API health:
```bash
curl http://localhost:3000/api/health
```

### Support

For questions or issues:
1. Check the [contact form documentation](./contact-form.md)
2. Review application logs
3. Test with minimal configuration
4. Contact the development team

