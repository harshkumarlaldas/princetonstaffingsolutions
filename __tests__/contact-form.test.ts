import { contactFormSchema } from '../lib/validation/contact.schema';
import { sanitizeContactFormData } from '../lib/security/sanitize';

describe('Contact Form Validation', () => {
  describe('contactFormSchema', () => {
    it('should validate a valid contact form submission', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company: 'Test Company',
        subject: 'Test Subject',
        message: 'This is a test message with more than 10 characters.',
        website: '', // Honeypot field should be empty
        formAge: 5, // Form age in seconds
        captchaToken: 'valid-captcha-token',
        privacyConsent: true,
      };

      const result = contactFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        message: 'Test message',
        website: '',
        formAge: 5,
        captchaToken: 'token',
        privacyConsent: true,
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
      }
    });

    it('should reject short name', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
        message: 'Test message',
        website: '',
        formAge: 5,
        captchaToken: 'token',
        privacyConsent: true,
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('name'))).toBe(true);
      }
    });

    it('should reject short message', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Short',
        website: '',
        formAge: 5,
        captchaToken: 'token',
        privacyConsent: true,
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('message'))).toBe(true);
      }
    });

    it('should reject without privacy consent', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
        website: '',
        formAge: 5,
        captchaToken: 'token',
        privacyConsent: false,
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('privacyConsent'))).toBe(true);
      }
    });

    it('should reject form submitted too quickly', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
        website: '',
        formAge: 1, // Too quick
        captchaToken: 'token',
        privacyConsent: true,
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('formAge'))).toBe(true);
      }
    });

    it('should reject without CAPTCHA token', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
        website: '',
        formAge: 5,
        captchaToken: '',
        privacyConsent: true,
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('captchaToken'))).toBe(true);
      }
    });
  });

  describe('sanitizeContactFormData', () => {
    it('should sanitize input data', () => {
      const rawData = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'JOHN@EXAMPLE.COM',
        phone: '<script>alert("xss")</script>+1234567890',
        company: 'Test <b>Company</b>',
        subject: 'Test Subject',
        message: 'Test message with <script>alert("xss")</script> HTML',
      };

      const sanitized = sanitizeContactFormData(rawData);

      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.phone).toBe('+1234567890');
      expect(sanitized.company).toBe('Test Company');
      expect(sanitized.subject).toBe('Test Subject');
      expect(sanitized.message).toBe('Test message with HTML');
    });

    it('should handle empty or null values', () => {
      const rawData = {
        name: '',
        email: null as any,
        phone: undefined as any,
        company: '',
        subject: '',
        message: '',
      };

      const sanitized = sanitizeContactFormData(rawData);

      expect(sanitized.name).toBe('');
      expect(sanitized.email).toBe('');
      expect(sanitized.phone).toBe('');
      expect(sanitized.company).toBe('');
      expect(sanitized.subject).toBe('');
      expect(sanitized.message).toBe('');
    });

    it('should truncate long messages', () => {
      const longMessage = 'A'.repeat(6000);
      const rawData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: longMessage,
      };

      const sanitized = sanitizeContactFormData(rawData);

      expect(sanitized.message.length).toBeLessThanOrEqual(5000);
      expect(sanitized.message).toContain('...');
    });
  });
});

