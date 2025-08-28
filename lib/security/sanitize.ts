/**
 * Sanitize user input to prevent XSS and other security issues
 */

export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol
    .replace(/data:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove on* event handlers
    .replace(/\bon\w+\s*=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email
    .toLowerCase()
    .trim()
    // Remove any HTML or script content
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}

export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  return phone
    .trim()
    // Remove any HTML or script content
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // Keep only digits, +, -, (, ), and spaces
    .replace(/[^\d\s\+\-\(\)]/g, '');
}

export function truncateString(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const sanitized = sanitizeString(input);
  
  if (sanitized.length <= maxLength) {
    return sanitized;
  }

  return sanitized.substring(0, maxLength) + '...';
}

export function sanitizeContactFormData(data: {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
}) {
  return {
    name: sanitizeString(data.name || ''),
    email: sanitizeEmail(data.email || ''),
    phone: sanitizePhone(data.phone || ''),
    company: sanitizeString(data.company || ''),
    subject: sanitizeString(data.subject || ''),
    message: truncateString(data.message || '', 5000),
  };
}

