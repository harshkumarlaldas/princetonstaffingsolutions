import { z } from 'zod';

// E.164 phone number validation (basic) - more lenient
const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,14}$/;

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email must be less than 254 characters'),
  
  phone: z
    .string()
    .optional()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Please enter a valid phone number (e.g., +1234567890)',
    }),
  
  company: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
  
  subject: z
    .string()
    .max(200, 'Subject must be less than 200 characters')
    .optional(),
  
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be less than 5000 characters'),
  
  // Anti-spam fields
  website: z.string().optional(), // Honeypot field
  formAge: z.number().min(3, 'Please wait at least 3 seconds before submitting'), // Form age check
  captchaToken: z.string().min(1, 'Please complete the CAPTCHA'),
  
  // Privacy consent
  privacyConsent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must agree to our privacy policy and terms of service',
    }),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Server-side validation schema (stricter)
export const serverContactSchema = contactFormSchema.extend({
  // Additional server-side validations
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.number(),
});

export type ServerContactData = z.infer<typeof serverContactSchema>;
